import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const quickSettings = Main.panel.statusArea.quickSettings;

async function execCommand(argv) {
    try {
        const proc = new Gio.Subprocess({
            argv,
            flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        });
        proc.init(null);

        const [stdout, stderr] = await proc.communicate_utf8(null, null);
        if (!proc.get_successful())
            throw new Error(stderr || 'Command failed');

        return (stdout || '').trim().replace('brightness', '').trim();
    } catch (e) {
        throw e;
    }
}

const StudiSlider = GObject.registerClass(
class StudiSlider extends QuickSettings.QuickSlider {
    _init(extension) {
        this._extension = extension;
        this._displayCmd = this._getDisplayCommand();
        
        const iconFile = Gio.File.new_for_path(`${this._extension.path}/apple.svg`);
        const gicon = Gio.Icon.new_for_string(iconFile.get_uri());

        super._init({
            gicon,
        });

        this._isInternalUpdate = false;
        this._updateTimeoutId = 0;
        this._pendingValue = -1;

        this.slider.accessible_name = 'Studio Display Brightness';
        this.slider.connect('notify::value', () => this._onValueChanged());

        this.sync();
    }

    _getDisplayCommand() {
        const binaries = ['studi', 'asdbctl'];
        for (const bin of binaries) {
            const path = GLib.find_program_in_path(bin);
            if (path) return path;
        }

        const home = GLib.get_home_dir();
        const cargoPaths = [
            `${home}/.cargo/bin/studi`,
            `${home}/.cargo/bin/asdbctl`,
        ];

        for (const path of cargoPaths) {
            if (GLib.file_test(path, GLib.FileTest.IS_EXECUTABLE))
                return path;
        }

        return 'studi';
    }

    _onValueChanged() {
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
    }

    async _setBrightness(level) {
        try {
            level = Math.clamp(level, 0, 100);
            await execCommand([this._displayCmd, 'set', level.toString()]);
        } catch (e) {
            console.error(e);
        }
    }

    async sync() {
        try {
            const output = await execCommand([this._displayCmd, 'get']);
            const level = parseInt(output);

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

    destroy() {
        if (this._updateTimeoutId) {
            GLib.source_remove(this._updateTimeoutId);
            this._updateTimeoutId = 0;
        }
        super.destroy();
    }
});

const StudiIndicator = GObject.registerClass(
class StudiIndicator extends QuickSettings.SystemIndicator {
    _init(extension) {
        super._init();
        
        this.slider = new StudiSlider(extension); 
        this.quickSettingsItems.push(this.slider);
        this.visible = false;

        this._injectToGrid();
    }

    _injectToGrid() {
        const brightnessIndicator = quickSettings._brightness;
        if (!brightnessIndicator) {
            quickSettings.addExternalIndicator(this);
            return;
        }

        const brightnessSlider = brightnessIndicator.quickSettingsItems[0];
        const items = quickSettings.menu._grid.get_children();
        const brightnessIndex = items.indexOf(brightnessSlider);
        const nextItem = brightnessIndex >= 0 ? items[brightnessIndex + 1] : null;

        if (nextItem) {
            quickSettings.menu.insertItemBefore(this.slider, nextItem, 2);
        } else {
            quickSettings.addExternalIndicator(this);
        }
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

export default class StudiExtension extends Extension {
    enable() {
        this._indicator = new StudiIndicator(this); 
        this._slider = this._indicator.slider;

        this._checkDisplay();

        this._menuSignal = quickSettings.menu.connect('open-state-changed', (menu, open) => {
            if (open) this._checkDisplay();
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
        this._slider = null;
    }
}

