---
name: spring--command-native-metadata
description: >-
  Register GraalVM reflection metadata when creating or changing a command,
  command handler, or domain event in this Tauri + Spring Boot app. Jackson
  serializes those types into the audit log, and an unregistered type becomes
  `{}` in the native binary. Use when adding, renaming, or removing a Command,
  CommandHandler, or Event, or when the user mentions reachability-metadata.json,
  NativeHintsRegistrar, or native-image serialization. Do not use the global
  spring--graalvm-native skill as the checklist for this repo's command types.
---

# Command metadata for the GraalVM native binary

This app ships a GraalVM native image. Jackson writes each command and domain
event into the `event` audit table. A type whose constructors and getters are
not registered serializes as `{}` with no error.

## Mandatory trigger

Load this skill **before** finishing any change that adds, renames, or removes:

- a `Command` (`…/command/**/*.kt`)
- a `CommandHandler` (`…/commandhandler/**/*.kt`)
- a domain event (`…/event/**/*.kt`)
- a new DTO used as a command result or event payload that is not already listed

Field edits on a type that is **already** registered need no new entry. The
existing entry uses `allDeclaredMethods` and `allDeclaredFields`. A **renamed
class** must update the `type` string. A **deleted** class must be removed.

## Where to register

| Type | `reachability-metadata.json` | `NativeHintsRegistrar.kt` |
|---|---|---|
| Command | yes | yes |
| Event | yes | yes |
| CommandHandler | yes | no |
| New payload DTO not already listed | yes | yes, if it is returned or audited |

File (edit this source file, never `build/generated/…`):

`backend-spring/src/main/resources/META-INF/native-image/reachability-metadata.json`

Kotlin registrar (commands and events only, same classes the JSON lists):

`backend-spring/src/main/kotlin/com/scriptmanager/common/config/NativeHintsRegistrar.kt`

`reflect-config.json` in the same directory does **not** list commands. Do not
add them there.

## JSON entry

Add one object to the `reflection` array, next to the sibling command, handler,
or event. Copy the flags exactly:

```json
{
  "type": "com.scriptmanager.boundedcontext.scriptmanager.command.script.DuplicateScriptCommand",
  "allDeclaredConstructors": true,
  "allPublicConstructors": true,
  "allDeclaredMethods": true,
  "allPublicMethods": true,
  "allDeclaredFields": true,
  "allPublicFields": true,
  "allRecordComponents": true,
  "queryAllPublicMethods": true,
  "queryAllDeclaredMethods": true
}
```

Use the class FQCN. Do not register the Kotlin `$Companion`.

Confirm the file still parses:

```bash
python3 -c "import json; json.load(open('backend-spring/src/main/resources/META-INF/native-image/reachability-metadata.json'))"
```

## Checklist

- [ ] New command, event, and handler classes follow the existing Kotlin types in this repo (`data class` + `Command<R>`, `@Component` handler, plain event, `eventQueue.add`)
- [ ] Command and event added to `NativeHintsRegistrar`
- [ ] Command, event, and handler added to `reachability-metadata.json`
- [ ] New payload DTO registered too, if it is not already in that file
- [ ] Rename or delete updated both registries
- [ ] JSON parses
- [ ] Did **not** edit `reflect-config.json`
