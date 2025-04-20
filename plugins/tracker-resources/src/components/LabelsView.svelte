<script lang="ts">
  import { getClient } from '@hanzo/presentation'
  import tags, { TagElement } from '@hanzo/tags'
  import { selectedTagElements } from '@hanzo/tags-resources'
  import { Component, getCurrentResolvedLocation, navigate } from '@hanzo/ui'
  import { Filter } from '@hanzo/view'
  import { buildFilterKey, setFilters } from '@hanzo/view-resources'
  import tracker from '../plugin'

  function setFilterTag (tag: TagElement) {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const attribute = hierarchy.getAttribute(tracker.class.Issue, 'labels')
    const key = buildFilterKey(hierarchy, tracker.class.Issue, '_class', attribute)
    const filter = {
      key,
      value: [tag._id],
      props: { level: 0 },
      modes: [tags.filter.FilterTagsIn, tags.filter.FilterTagsNin],
      mode: tags.filter.FilterTagsIn,
      index: 1
    } as unknown as Filter
    setFilters([filter])
  }
  async function onTag (tag: TagElement): Promise<void> {
    selectedTagElements.set([tag._id])
    const loc = getCurrentResolvedLocation()
    loc.path[2] = 'tracker'
    loc.path[3] = 'all-issues'
    loc.path.length = 4
    navigate(loc)
    setTimeout(() => {
      setFilterTag(tag)
    }, 200)
  }
</script>

<Component
  is={tags.component.TagsView}
  props={{
    targetClass: tracker.class.Issue,
    title: tracker.string.Labels,
    icon: tracker.icon.Labels,
    item: tracker.string.Labels,
    key: 'labels',
    createItemLabel: tracker.string.AddLabel,
    onTag
  }}
></Component>
