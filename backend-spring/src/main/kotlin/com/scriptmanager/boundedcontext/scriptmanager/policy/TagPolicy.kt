package com.scriptmanager.boundedcontext.scriptmanager.policy

import com.machingclee.domain.util.common.interfaces.Invariant
import com.machingclee.domain.util.common.interfaces.Policy
import com.scriptmanager.boundedcontext.scriptmanager.event.TagDeletedEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

@Component
class TagPolicy : Policy {

    @EventListener
    @Invariant("A tag that still has assigned tags cannot be deleted")
    fun onTagDeleted(event: TagDeletedEvent) {
        if (event.assignedTags.size > 0) {
            throw RuntimeException("Cannot delete tag because assigned tags exist")
        }
    }
}
