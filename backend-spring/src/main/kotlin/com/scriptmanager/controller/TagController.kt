package com.scriptmanager.controller

import com.machingclee.domain.util.common.interfaces.CommandBus
import com.machingclee.domain.util.common.query.interfaces.QueryBus
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.CreateTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.DeleteTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.UpdateTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllTagsQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetTagByIdQuery
import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.CreateTagRequest
import com.scriptmanager.common.entity.TagDTO
import com.scriptmanager.common.entity.toDTO
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/tags")
@Tag(name = "Tag Management", description = "APIs for managing tags")
class TagController(
    private val commandBus: CommandBus,
    private val queryBus: QueryBus
) {

    @Operation(summary = "Get all tags", description = "Retrieves every tag ordered by name")
    @GetMapping
    fun getAllTags(): ApiResponse<List<TagDTO>> {
        return ApiResponse(queryBus.send(GetAllTagsQuery()))
    }

    @Operation(summary = "Get tag by ID", description = "Retrieves a tag by its ID")
    @GetMapping("/{id}")
    fun getTagById(
        @Parameter(description = "Tag ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<TagDTO> {
        return ApiResponse(queryBus.send(GetTagByIdQuery(tagId = id)))
    }

    @Operation(summary = "Create a tag", description = "Creates a tag. Name is unique, ignoring case")
    @PostMapping
    fun createTag(
        @Parameter(description = "Tag details", required = true)
        @RequestBody request: CreateTagRequest
    ): ApiResponse<TagDTO> {
        val saved = commandBus.send(
            CreateTagCommand(name = request.name, tagFolderId = request.tagFolderId)
        )
        return ApiResponse(saved.toDTO())
    }

    @Operation(summary = "Update a tag", description = "Updates a tag's name and optional tag folder")
    @PutMapping("/{id}")
    fun updateTag(
        @Parameter(description = "Tag ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated tag details", required = true)
        @RequestBody request: TagDTO
    ): ApiResponse<TagDTO> {
        val result = commandBus.send(
            UpdateTagCommand(id = id, name = request.name, tagFolderId = request.tagFolderId)
        )
        return ApiResponse(result)
    }

    @Operation(summary = "Delete a tag", description = "Deletes a tag and its assignments")
    @DeleteMapping("/{id}")
    fun deleteTag(
        @Parameter(description = "Tag ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        commandBus.send(DeleteTagCommand(tagId = id))
        return ApiResponse()
    }
}
