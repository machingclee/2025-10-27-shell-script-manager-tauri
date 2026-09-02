plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    kotlin("plugin.jpa") version "2.2.21"
    id("org.springframework.boot") version "4.0.7"
    id("io.spring.dependency-management") version "1.1.7"
    id("com.google.devtools.ksp") version "2.2.21-2.0.5"
    id("org.graalvm.buildtools.native") version "0.11.1"
}

group = "com.scriptmanager"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenLocal()
    mavenCentral()
}

dependencies {
    implementation("com.machingclee:domain-util:0.2.6")

    implementation("io.micrometer:micrometer-core")
    implementation("io.micrometer:micrometer-tracing-bridge-otel")
    implementation("io.opentelemetry:opentelemetry-sdk")
    implementation("io.opentelemetry:opentelemetry-exporter-logging")
    implementation("net.ttddyy.observation:datasource-micrometer-spring-boot:2.2.1")

    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")

    // domain-util serializes command/event payloads with Jackson 2 (optional dep).
    // Boot 4's web starter only ships Jackson 3 (tools.jackson).
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    runtimeOnly("com.h2database:h2")
    implementation("org.springframework.boot:spring-boot-h2console")

    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testImplementation("org.junit.platform:junit-platform-suite-api")
    testRuntimeOnly("org.junit.platform:junit-platform-suite-engine")

    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.postgresql:postgresql")

    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3")

    ksp(project(":processor"))
    implementation(project(":processor"))
}

configurations.all {
    exclude(group = "tools.jackson.module", module = "jackson-module-afterburner")
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        freeCompilerArgs.addAll(
            "-Xannotation-default-target=param-property",
            "-java-parameters"
        )
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.named<Test>("test") {
    useJUnitPlatform()
}

// Disable KSP for AOT test processing (it causes issues and isn't needed for tests)
tasks.matching { it.name == "kspAotTestKotlin" }.configureEach {
    enabled = false
}

tasks.register<Jar>("fatJar") {
    archiveClassifier.set("fat")
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    manifest {
        attributes["Main-Class"] = "com.scriptmanager.ApplicationKt"
    }
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
    from(sourceSets.main.get().output)
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("backend-native")
            mainClass.set("com.scriptmanager.ApplicationKt")

            buildArgs.add("--verbose")
            buildArgs.add("-H:+ReportExceptionStackTraces")

            buildArgs.add("--initialize-at-run-time=ch.qos.logback")
            buildArgs.add("--initialize-at-run-time=org.slf4j.LoggerFactory")
            buildArgs.add("--initialize-at-run-time=io.netty.handler.ssl")

            buildArgs.add("-H:+AddAllCharsets")
            buildArgs.add("-H:EnableURLProtocols=http,https")
        }
    }
}
