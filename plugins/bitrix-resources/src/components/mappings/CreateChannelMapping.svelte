<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    ChannelFieldMapping,
    CreateChannelOperation,
    Fields,
    MappingOperation
  } from '@hanzo/bitrix'
  import { AnyAttribute } from '@hanzo/core'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'

  import contact, { ChannelProvider } from '@hanzo/contact'
  import { Button, DropdownLabels, DropdownLabelsIntl, EditBox, IconAdd, IconDelete } from '@hanzo/ui'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let channelFields: ChannelFieldMapping[] = [...((field?.operation as CreateChannelOperation)?.fields ?? [])]

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.CreateChannel,
          fields: channelFields
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.CreateChannel,
          fields: channelFields
        }
      })
    }
  }

  $: items = Object.entries(fields)
    .filter((it) => {
      return it[1].type !== 'enumeration'
    })
    .map((it) => ({
      id: it[0],
      label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]}`
    }))

  let providers: ChannelProvider[] = []
  client.findAll(contact.class.ChannelProvider, {}).then((res) => {
    providers = res
  })

  $: providerItems = providers.map((it) => ({ id: it._id, label: it.label }))
</script>

<div class="flex-col flex-wrap">
  {#each channelFields as p, i}
    <div class="pattern flex-row-center gap-2">
      <DropdownLabelsIntl
        minW0={false}
        label={getEmbeddedLabel('Channel')}
        items={providerItems}
        bind:selected={p.provider}
      />
      <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={p.field} />
      <EditBox bind:value={p.include} placeholder={getEmbeddedLabel('should...')} />
      <EditBox bind:value={p.exclude} placeholder={getEmbeddedLabel('not...')} />

      <div class="ml-1">
        <Button
          icon={IconDelete}
          size={'small'}
          on:click={() => {
            channelFields.splice(i, 1)
            channelFields = channelFields
          }}
        />
      </div>
    </div>
  {/each}
  <div class="ml-2">
    <Button
      icon={IconAdd}
      size={'small'}
      on:click={() => {
        channelFields = [...channelFields, { field: items[0].id, provider: providers[0]._id }]
      }}
    />
  </div>
</div>

<style lang="scss">
  .pattern {
    margin: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
    border: 1px dashed var(--accent-color);
    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    // text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }
  }
</style>
