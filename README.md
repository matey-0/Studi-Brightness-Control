# Studi-Brightness-Control
GNOME plugin to control Apple Studio Display brightness through the quick settings menu.

## Installation
You can install this plugin by placing the ``Studi-Brightness-Control@matey-0`` folder in the following path: ``~/.local/share/gnome-shell/extensions/Studi-Brightness-Control@matey-0``.  

You'll then need to toggle the plugin on; I recommend using a good extension manager, such as https://mattjakeman.com/apps/extension-manager. 

Make sure you have Studi installed: https://github.com/himbeles/studi, as it's the backend that allows this project to work. This doesn't do any low-level control; it's just a front end for the Studi CLI that tries to look native. You'll need to change the path for studi in the ``extention.js``, this line: ``const STUDI_CMD = '/home/*/.cargo/bin/studi';
``. Change it to wherever you have studi installed. 
