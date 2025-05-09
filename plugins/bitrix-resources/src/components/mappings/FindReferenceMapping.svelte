<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixEntityType,
    BitrixFieldMapping,
    Fields,
    FindReferenceOperation,
    MappingOperation,
    mappingTypes
  } from '@hanzo/bitrix'
  import core, { AnyAttribute } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import { DropdownLabels, DropdownTextItem } from '@hanzo/ui'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let findField: string = (field?.operation as FindReferenceOperation)?.field ?? ''
  let referenceType = (field?.operation as FindReferenceOperation)?.referenceType ?? BitrixEntityType.Company
  let referenceClass = (field?.operation as FindReferenceOperation)?.referenceClass ?? core.class.Doc

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.FindReference,
          field: findField,
          referenceType,
          referenceClass
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.FindReference,
          field: findField,
          referenceType,
          referenceClass
        }
      })
    }
  }

  function getItems (fields: Fields): DropdownTextItem[] {
    return Object.entries(fields)
      .filter((it) => it[1].type === 'crm_company' || it[1].type === 'user' || it[1].type === 'crm')
      .map((it) => ({
        id: it[0],
        label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]} - ${it[1].type}`
      }))
  }
  $: items = getItems(fields)

  let classes: DropdownTextItem[] = []

  client.findAll(core.class.Class, {}).then((res) => {
    classes = res.map((it) => ({ id: it._id, label: it._id }))
  })
</script>

<div class="flex-col flex-wrap">
  <div class="pattern flex-row-center gap-2">
    <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={findField} />

    <DropdownLabels
      minW0={false}
      label={bitrix.string.FieldMapping}
      items={[...mappingTypes, { id: '#', label: 'None' }]}
      bind:selected={referenceType}
    />

    <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} items={classes} bind:selected={referenceClass} />
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
