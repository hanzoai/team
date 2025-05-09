<script lang="ts">
  import { Employee } from '@hanzo/contact'
  import { Class, Doc, Ref } from '@hanzo/core'
  import { ModernButton, navigate, resizeObserver } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import view from '@hanzo/view'
  import { getObjectLinkFragment } from '@hanzo/view-resources'
  import { ComponentExtensions, getClient } from '@hanzo/presentation'

  import contact from '../plugin'
  import Avatar from './Avatar.svelte'
  import { employeeByIdStore, statusByUserStore } from '../utils'
  import { EmployeePresenter } from '../index'

  export let employeeId: Ref<Employee>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let employee: Employee | undefined = undefined

  $: employee = $employeeByIdStore.get(employeeId)
  $: isOnline = employee?.personUuid !== undefined && $statusByUserStore.get(employee.personUuid)?.online === true

  // const statusesQuery = createQuery()
  // let editable = false
  // let status: Status | undefined = undefined
  // $: editable = employeeId === me
  // statusesQuery.query(contact.class.Status, { attachedTo: employeeId }, (res) => {
  //   status = res[0]
  // })

  // function setStatus (): void {
  //   if (!employee) return
  //   showPopup(
  //     EmployeeSetStatusPopup,
  //     {
  //       currentStatus: status
  //     },
  //     undefined,
  //     () => {},
  //     async (newStatus: Status) => {
  //       if (status && newStatus) {
  //         await client.updateDoc(contact.class.Status, status.space, status._id, { ...newStatus })
  //       } else if (status && !newStatus) {
  //         await client.removeDoc(contact.class.Status, status.space, status._id)
  //       } else {
  //         await client.addCollection(contact.class.Status, employee.space, employeeId, contact.mixin.Employee, 'statuses', {
  //           name: newStatus.name,
  //           dueDate: newStatus.dueDate
  //         })
  //       }
  //     }
  //   )
  //   dispatch('close')
  // }

  async function viewProfile (): Promise<void> {
    if (employee === undefined) return
    const panelComponent = hierarchy.classHierarchyMixin(employee._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, employee, {}, comp)
    navigate(loc)
  }
</script>

<div
  class="root flex-col"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  {#if employee}
    <div class="flex-presenter flex-gap-2 p-2">
      <Avatar size="large" person={employee} name={employee.name} />
      <span class="username">
        <EmployeePresenter value={employee} shouldShowAvatar={false} showPopup={false} compact />
      </span>
      <span class="hanzoaiAvatar-statusMarker small relative mt-0-5" class:online={isOnline} class:offline={!isOnline} />
    </div>
    <div class="separator" />
    <div class="flex-presenter flex-gap-2 p-2">
      <ComponentExtensions extension={contact.extension.EmployeePopupActions} props={{ employee }} />
      <ModernButton
        label={contact.string.ViewProfile}
        icon={contact.icon.Person}
        size="small"
        iconSize="small"
        on:click={viewProfile}
      />
    </div>

    <!--{#if status}-->
    <!--  <div class="pb-2">-->
    <!--    <Label label={contact.string.Status} />-->
    <!--    <div class="flex-row-stretch statusContainer">-->
    <!--      <div class="pr-2">-->
    <!--        <EmployeeStatusPresenter {employee} withTooltip={false} />-->
    <!--      </div>-->
    <!--      {#if editable}-->
    <!--        <div class="setStatusButton">-->
    <!--          <Button icon={Edit} title={contact.string.SetStatus} on:click={setStatus} />-->
    <!--        </div>-->
    <!--      {/if}-->
    <!--    </div>-->
    <!--  </div>-->
    <!--{:else if editable}-->
    <!--  &lt;!&ndash; svelte-ignore a11y-click-events-have-key-events &ndash;&gt;-->
    <!--  &lt;!&ndash; svelte-ignore a11y-no-static-element-interactions &ndash;&gt;-->
    <!--  <div class="flex-row-stretch over-underline pb-2" on:click={setStatus}>-->
    <!--    <Label label={contact.string.SetStatus} />-->
    <!--  </div>-->
    <!--{/if}-->
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    width: auto;
    min-height: 0;
    min-width: 0;
    max-width: 30rem;
    background: var(--theme-popup-color);
    user-select: none;
  }

  .separator {
    height: 1px;
    width: 100%;
    background: var(--global-ui-BorderColor);
  }

  .username {
    font-weight: 500;
  }

  //.statusContainer {
  //  .setStatusButton {
  //    opacity: 0;
  //  }
  //
  //  &:hover .setStatusButton {
  //    opacity: 1;
  //  }
  //}
</style>
