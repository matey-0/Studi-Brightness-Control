import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const quickSettings = Main.panel.statusArea.quickSettings;

function getDisplayCommand() {
    let cmd = GLib.find_program_in_path('studi');
    if (cmd) return cmd;

    cmd = GLib.find_program_in_path('asdbctl');
    if (cmd) return cmd;

    const home = GLib.get_home_dir();
    const studiCargo = `${home}/.cargo/bin/studi`;
    if (GLib.file_test(studiCargo, GLib.FileTest.IS_EXECUTABLE)) {
        return studiCargo;
    }

    const asdbCargo = `${home}/.cargo/bin/asdbctl`;
    if (GLib.file_test(asdbCargo, GLib.FileTest.IS_EXECUTABLE)) {
        return asdbCargo;
    }

    return studiCargo;
}

function execCommand(argv) {
    return new Promise((resolve, reject) => {
        try {
            let proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let output = stdout ? stdout.trim() : '';
                        output = output.replace('brightness', '').trim();
                        resolve(output);
                    } else {
                        reject(new Error(stderr || 'Command failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

const StudiSlider = GObject.registerClass(
class StudiSlider extends QuickSettings.QuickSlider {
    _init(extension) {
        const DISPLAY_CMD = getDisplayCommand();
        const extensionDir = extension.dir;
        const iconFile = Gio.File.new_for_path(extensionDir.get_path() + '/apple.svg');
        const customIcon = Gio.icon_new_for_string(iconFile.get_uri());
        
        super._init({
            gicon: customIcon,
        });

        this._isInternalUpdate = false;
        this._updateTimeoutId = 0;
        this._pendingValue = -1;

        this.slider.accessible_name = 'Studio Display Brightness';

        this.slider.connect('notify::value', () => {
            if (this._isInternalUpdate) return;

            const percentage = Math.round(this.slider.value * 100);

            if (this._updateTimeoutId) {
                this._pendingValue = percentage;
                return;
            }

            this._setBrightness(percentage);

            this._updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this._updateTimeoutId = 0;
                if (this._pendingValue !== -1) {
                    this._setBrightness(this._pendingValue);
                    this._pendingValue = -1;
                }
                return GLib.SOURCE_REMOVE;
            });
        });

        this.sync();
    }

    destroy() {
        if (this._updateTimeoutId) {
            GLib.source_remove(this._updateTimeoutId);
            this._updateTimeoutId = 0;
        }
        super.destroy();
    }

    async _setBrightness(level) {
        try {
            level = Math.max(0, Math.min(100, level));
            await execCommand([DISPLAY_CMD, 'set', level.toString()]);
        } catch (e) {
        }
    }

    async sync() {
        try {
            const output = await execCommand([DISPLAY_CMD, 'get']);
            let level = parseInt(output.trim());

            if (!isNaN(level)) {
                this._isInternalUpdate = true;
                this.slider.value = level / 100;
                this._isInternalUpdate = false;
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }
});


const StudiIndicator = GObject.registerClass(
class StudiIndicator extends QuickSettings.SystemIndicator {
    _init(extension) {
        super._init();
        
        this.slider = new StudiSlider(extension); 
        this.quickSettingsItems.push(this.slider);
        this.visible = false;

        const brightnessIndicator = quickSettings._brightness;
        const brightnessSlider = brightnessIndicator.quickSettingsItems[0];
        const items = quickSettings.menu._grid.get_children();
        const brightnessIndex = items.indexOf(brightnessSlider);
        const nextItem = brightnessIndex >= 0 ? items[brightnessIndex + 1] : null;

        if (brightnessSlider && nextItem) {
            quickSettings.menu.insertItemBefore(
                this.slider,
                nextItem,
                2
            );
        } else {
            quickSettings.addExternalIndicator(this, 2);
        }
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        this.quickSettingsItems = [];
        super.destroy();
    }
});


export default class StudiExtension extends Extension {
    enable() {
        this._indicator = new StudiIndicator(this); 
        this._slider = this._indicator.slider;

        this._checkDisplay();

        this._menuSignal = quickSettings.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                this._checkDisplay();
            }
        });
    }

    async _checkDisplay() {
        if (!this._slider || !this._indicator) return;

        const isConnected = await this._slider.sync();

        this._slider.visible = isConnected;
        this._indicator.visible = isConnected;
    }

    disable() {
        if (this._menuSignal) {
            quickSettings.menu.disconnect(this._menuSignal);
            this._menuSignal = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
