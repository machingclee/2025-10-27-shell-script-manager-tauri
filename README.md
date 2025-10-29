# Shell Script Manager

- This is a rewrite of thie previous project from [egui](https://github.com/machingclee/2025-10-15-shell-script-manager) into `tauri`
- The backends of the two projects share the same repositories (interacting with sqlite database). 
- The command handled in egui-version are now dispatched from the separated frontend project.
- We don't have event in the backend any more. We will add it back when our system becomes complicated, for now no complex side effects exist in the project.
