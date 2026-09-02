plugins {
    kotlin("jvm") version "2.2.21"
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
    api("com.google.devtools.ksp:symbol-processing-api:2.2.21-2.0.5")
    implementation(kotlin("stdlib"))
    implementation("com.squareup:kotlinpoet:2.2.0")
    implementation("com.squareup:kotlinpoet-ksp:2.2.0")
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

tasks.test {
    useJUnitPlatform()
}
