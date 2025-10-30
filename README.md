# Shell Script Manager

- This is a rewrite of the previous project from [egui](https://github.com/machingclee/2025-10-15-shell-script-manager) into `tauri`
- Functionalities are the same, additionally now the scripts can also be reordered.
- The backends of the two projects share the same repositories (interacting with sqlite database). 
- The command handled in egui-version are now dispatched from the separated frontend project.
- We don't have events (after command) in the backend any more. We will add it back when our system becomes complicated, for now no complex side effects exist in the project.

<img width="1412" height="912" alt="image" src="https://github.com/user-attachments/assets/ed0aa58f-d901-4b60-b56f-e8cb7a0b7f0f" />

https://github.com/user-attachments/assets/9a8c42e8-73ea-4f0b-a757-381269ae5952

