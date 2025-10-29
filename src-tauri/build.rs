fn main() {
    println!("cargo:rerun-if-changed=prisma/schema.prisma");
    prisma_client_rust_cli::run();
    tauri_build::build()
}
