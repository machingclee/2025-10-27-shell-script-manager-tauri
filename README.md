# Shell Script Manager

- This is a rewrite of the previous project from [egui](https://github.com/machingclee/2025-10-15-shell-script-manager) into `tauri`
- Functionalities are the same, additionally now the scripts can also be reordered.
- The backends of the two projects share the same repositories (interacting with sqlite database). 
- The command handled in egui-version are now dispatched from the separated frontend project.
- We don't have events (after command) in the backend any more. We will add it back when our system becomes complicated, for now no complex side effects exist in the project.

https://private-user-images.githubusercontent.com/54048398/514167718-f741ce2e-3376-4570-b8a1-7b527128ba4e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjMzMTczMzYsIm5iZiI6MTc2MzMxNzAzNiwicGF0aCI6Ii81NDA0ODM5OC81MTQxNjc3MTgtZjc0MWNlMmUtMzM3Ni00NTcwLWI4YTEtN2I1MjcxMjhiYTRlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMTYlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTE2VDE4MTcxNlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTVhOTkwYWE5NzE2MWQ2MWJiODgyNjFiODg3OWMyMTZkMzBmM2Y4MDRhNWIwMTAyMDZlYWNlZWJmMWRiYTI1YjgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.doZ_UgIfFSxUC-2H9vr9NA2XlDqU0A1ed3Zz8v8gTbo<img width="2824" height="1824" alt="image" src="https://github.com/user-attachments/assets/4ba8187e-a859-4cb1-98bb-299e6f5a5e1a" />


https://github.com/user-attachments/assets/a07d904a-2abe-494f-8fd0-0cbb6edf2cec

