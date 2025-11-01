plugins {
    kotlin("jvm") version "1.9.10"
    `java-library`
}

group = "dev.james"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}


repositories {
    mavenCentral()
}

sourceSets.main {
    kotlin.srcDir("build/generated/ksp/main/kotlin")
}
sourceSets.test {
    kotlin.srcDir("build/generated/ksp/test/kotlin")
}

dependencies {
    testImplementation(kotlin("test"))
    api("com.google.devtools.ksp:symbol-processing-api:1.9.10-1.0.13")
    implementation(kotlin("stdlib"))
    implementation("com.squareup:kotlinpoet:1.14.2")
    implementation("com.squareup:kotlinpoet-ksp:1.14.2")
}

tasks.test {
    useJUnitPlatform()
}