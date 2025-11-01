rootProject.name = "script-manager-backend"
pluginManagement {
    repositories {
        maven { url = uri("https://repo.spring.io/milestone") }
        maven { url = uri("https://repo.spring.io/snapshot") }
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
include("processor")