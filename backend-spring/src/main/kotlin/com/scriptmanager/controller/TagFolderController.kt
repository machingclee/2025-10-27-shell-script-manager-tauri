package com.scriptmanager.controller

import com.machingclee.domain.util.common.interfaces.CommandBus
import com.machingclee.domain.util.common.query.interfaces.QueryBus
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.CreateTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.DeleteTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.ReorderTagFoldersCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.UpdateTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllTagFoldersQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetTagFolderByIdQuery
import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.CreateTagFolderRequest
import com.scriptmanager.common.dto.ReorderTagFoldersRequest
import com.scriptmanager.common.entity.TagFolderDTO
import com.scriptmanager.common.entity.toDTO
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/tag-folders")
@Tag(name = "Tag Folder Management", description = "APIs for managing tag folders")
class TagFolderController(
    private val commandBus: CommandBus,
    private val queryBus: QueryBus
) {

    @Operation(summary = "Get all tag folders", description = "Retrieves every tag folder in stored order")
    @GetMapping
    fun getAllTagFolders(): ApiResponse<List<TagFolderDTO>> {
        return ApiResponse(queryBus.send(GetAllTagFoldersQuery()))
    }

    @Operation(summary = "Get tag folder by ID", description = "Retrieves a tag folder by its ID")
    @GetMapping("/{id}")
    fun getTagFolderById(
        @Parameter(description = "Tag folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<TagFolderDTO> {
        return ApiResponse(queryBus.send(GetTagFolderByIdQuery(tagFolderId = id)))
    }

    @Operation(summary = "Create a tag folder", description = "Creates a tag folder")
    @PostMapping
    fun createTagFolder(
        @Parameter(description = "Tag folder details", required = true)
        @RequestBody request: CreateTagFolderRequest
    ): ApiResponse<TagFolderDTO> {
        val saved = commandBus.send(CreateTagFolderCommand(name = request.name))
        return ApiResponse(saved.toDTO())
    }

    @Operation(summary = "Update a tag folder", description = "Updates a tag folder's name")
    @PutMapping("/{id}")
    fun updateTagFolder(
        @Parameter(description = "Tag folder ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated tag folder details", required = true)
        @RequestBody request: TagFolderDTO
    ): ApiResponse<TagFolderDTO> {
        val result = commandBus.send(UpdateTagFolderCommand(id = id, name = request.name))
        return ApiResponse(result)
    }

    @Operation(summary = "Reorder tag folders", description = "Moves a tag folder from one position to another")
    @PatchMapping("/reorder")
    fun reorderTagFolders(
        @RequestBody request: ReorderTagFoldersRequest
    ): ApiResponse<Unit> {
        commandBus.send(
            ReorderTagFoldersCommand(fromIndex = request.fromIndex, toIndex = request.toIndex)
        )
        return ApiResponse()
    }

    @Operation(summary = "Delete a tag folder", description = "Deletes a tag folder. Tags in it keep their rows and lose the folder link")
    @DeleteMapping("/{id}")
    fun deleteTagFolder(
        @Parameter(description = "Tag folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        commandBus.send(DeleteTagFolderCommand(tagFolderId = id))
        return ApiResponse()
    }
}
