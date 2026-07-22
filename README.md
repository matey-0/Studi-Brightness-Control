# Studi-Brightness-Control
<img width="1072" height="820" alt="Pasted image" src="https://github.com/user-attachments/assets/e3783b85-526e-47ba-9f71-1a4000157af7" />  

GNOME extension to control Apple Studio Display brightness through the quick settings menu.  

## Installation
First, make sure you have Studi and/or asdbctl installed (https://github.com/juliuszint/asdbctl or https://github.com/himbeles/studi), as it's the backend that allows this project to work. This doesn't do any low-level control; it's just a front end for the CLI tool(s) that tries to look native for GNOME. If you have both, Studi will take precedence.  

### Manual  
You can then install this extension by placing the ``Studi-Brightness-Control@matey-0`` folder in the following path: ``~/.local/share/gnome-shell/extensions/Studi-Brightness-Control@matey-0``. You'll then need to toggle the extension on; just run ``gnome-extensions enable Studi-Brightness-Control@matey-0`` in the terminal (if it doesn't work, you might need to reboot, or restart your GNOME session).

### GNOME Extension  
Alternatively, you can install the extension here: https://extensions.gnome.org/extension/9207/studi-brightness-control/, and then toggle it on via the CLI in the same way, with the following command: ``gnome-extensions enable Studi-Brightness-Control@matey-0``.  
