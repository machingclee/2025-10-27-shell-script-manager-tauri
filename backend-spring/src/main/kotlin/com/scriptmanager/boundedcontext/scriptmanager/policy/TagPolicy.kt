package com.scriptmanager.boundedcontext.scriptmanager.policy

import com.machingclee.domain.util.common.interfaces.Invariant
import com.machingclee.domain.util.common.interfaces.Policy
import com.scriptmanager.boundedcontext.scriptmanager.event.TagDeletedEvent
import com.scriptmanager.repository.TagRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.FlushModeType
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class TagPolicy(
    private val tagRepository: TagRepository
) : Policy {

    @EventListener
    @Invariant("A tag that still has assigned tags cannot be deleted")
    fun onTagDeleted(event: TagDeletedEvent) {
        val tagId = event.tag.id ?: return
        val tag = tagRepository.findByIdOrNull(tagId) ?: throw RuntimeException("Tag with id $tagId not found")
        val assignedCount = tag.assignedTags.size
        if (assignedCount > 0) {
            throw RuntimeException("Cannot delete tag because assigned tags exist")
        }
    }
}
