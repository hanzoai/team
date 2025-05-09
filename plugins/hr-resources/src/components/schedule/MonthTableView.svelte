<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Employee } from '@hanzo/contact'
  import { Doc, Ref } from '@hanzo/core'
  import type { Request, RequestType, Staff } from '@hanzo/hr'
  import { Department } from '@hanzo/hr'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { Button, DropdownIntlItem, Label, Loading, showPopup, tableToCSV } from '@hanzo/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@hanzo/view'
  import { TableBrowser, ViewletSelector, ViewletSettingButton } from '@hanzo/view-resources'
  import hr from '../../plugin'
  import {
    EmployeeReports,
    getEndDate,
    getHolidayDatesForEmployee,
    getMonth,
    getRequestDates,
    getRequests,
    getStartDate,
    getTotal,
    weekDays
  } from '../../utils'
  import HolidayPresenter from './HolidayPresenter.svelte'
  import ReportPresenter from './ReportPresenter.svelte'
  import StatPresenter from './StatPresenter.svelte'

  export let currentDate: Date = new Date()

  export let departmentStaff: Staff[]
  export let types: Map<Ref<RequestType>, RequestType>
  export let preference: ViewletPreference | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let loading: boolean = false

  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let timeReports: Map<Ref<Employee>, EmployeeReports>
  export let holidays: Map<Ref<Department>, Date[]> = new Map<Ref<Department>, Date[]>()
  export let getHolidays: (month: Date) => Promise<Map<Ref<Department>, Date[]>>
  $: month = getStartDate(currentDate.getFullYear(), currentDate.getMonth()) // getMonth(currentDate, currentDate.getMonth())
  $: wDays = weekDays(month.getFullYear(), month.getMonth())

  export let staffDepartmentMap: Map<Ref<Staff>, Department[]>

  function getDateRange (request: Request, staff: Staff): string {
    const ds = getRequestDates(
      request,
      types,
      month.getFullYear(),
      month.getMonth(),
      getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays)
    )
    return ds.join(' ')
  }

  function getStatRequests (employee: Ref<Staff>, date: Date): Request[] {
    const endDate = getEndDate(date.getFullYear(), date.getMonth())

    return getRequests(employeeRequests, date, endDate, employee)
  }

  function getTypeVals (month: Date): Map<string, BuildModelKey> {
    return new Map(
      Array.from(types.values()).map((it) => [
        it.label as string,
        {
          key: '',
          label: it.label,
          presenter: StatPresenter,
          props: {
            month: month ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (req: Request[], staff: Staff) =>
              req
                .filter((r) => r.type === it._id)
                .map((it) => getDateRange(it, staff))
                .join(' '),
            getStatRequests
          }
        }
      ])
    )
  }

  async function getOverrideConfig (startDate: Date): Promise<Map<string, BuildModelKey>> {
    const holidays = await getHolidays(startDate)
    const typevals = getTypeVals(startDate)
    const endDate = getEndDate(startDate.getFullYear(), startDate.getMonth())

    const getReport = (id: Ref<Doc>): EmployeeReports => {
      return timeReports.get(id as Ref<Employee>) ?? { value: 0, reports: [], tasks: new Map() }
    }
    const getTPD = (id: Ref<Doc>): number => {
      const rr = getReport(id)
      if (rr.value === 0) {
        return 0
      }
      return rr.tasks.size / rr.value
    }

    return new Map<string, BuildModelKey>([
      [
        '@wdCount',
        {
          key: '',
          label: hr.string.WorkingDays,
          presenter: StatPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (req: Request[], staff: Staff) => {
              const dates = getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays)
              const total = getTotal(req, startDate, endDate, types, dates)
              return wDays + total - dates.length
            },
            getStatRequests
          },
          sortingKey: '@wdCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(
              getStatRequests(b._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, b._id as Ref<Staff>, holidays)
            ) -
            getTotal(
              getStatRequests(a._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, a._id as Ref<Staff>, holidays)
            )
        }
      ],
      [
        '@wdCountReported',
        {
          key: '',
          label: hr.string.ReportedDays,
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getReport(staff._id).value
          },
          sortingKey: '@wdCountReported',
          sortingFunction: (a: Doc, b: Doc) => getReport(b._id).value - getReport(a._id).value
        }
      ],
      [
        '@wdCountPublicHolidays',
        {
          key: '',
          label: hr.string.PublicHolidays,
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays).length
          },
          sortingKey: '@wdCountPublicHolidays',
          sortingFunction: (a: Doc, b: Doc) =>
            getHolidayDatesForEmployee(staffDepartmentMap, b._id as Ref<Staff>, holidays).length -
            getHolidayDatesForEmployee(staffDepartmentMap, a._id as Ref<Staff>, holidays).length
        }
      ],
      [
        '@wdTaskCountReported',
        {
          key: '',
          label: hr.string.Tasks,
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getReport(staff._id).tasks.size
          },
          sortingKey: '@wdTaskCountReported',
          sortingFunction: (a: Doc, b: Doc) => getReport(b._id).tasks.size - getReport(a._id).tasks.size
        }
      ],
      [
        '@wdTaskPerDayReported',
        {
          key: '',
          label: hr.string.TPD,
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getTPD(staff._id)
          },
          sortingKey: '@wdTaskPerDayReported',
          sortingFunction: (a: Doc, b: Doc) => getTPD(b._id) - getTPD(a._id)
        }
      ],
      [
        '@ptoCount',
        {
          key: '',
          label: hr.string.PTOs,
          presenter: StatPresenter,
          props: {
            month: startDate ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[], staff: Staff) =>
              getTotal(
                req,
                startDate,
                endDate,
                types,
                getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays),
                (a) => (a < 0 ? Math.abs(a) : 0)
              ),
            getStatRequests
          },
          sortingKey: '@ptoCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(
              getStatRequests(b._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, b._id as Ref<Staff>, holidays),
              (a) => (a < 0 ? Math.abs(a) : 0)
            ) -
            getTotal(
              getStatRequests(a._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, a._id as Ref<Staff>, holidays),
              (a) => (a < 0 ? Math.abs(a) : 0)
            )
        }
      ],
      [
        '@extraCount',
        {
          key: '',
          label: hr.string.EXTRa,
          presenter: StatPresenter,
          props: {
            month: startDate ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[], staff: Staff) =>
              getTotal(
                req,
                startDate,
                endDate,
                types,
                getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays),
                (a) => (a > 0 ? Math.abs(a) : 0)
              ),
            getStatRequests
          },
          sortingKey: '@extraCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(
              getStatRequests(b._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, b._id as Ref<Staff>, holidays),
              (a) => (a > 0 ? Math.abs(a) : 0)
            ) -
            getTotal(
              getStatRequests(a._id as Ref<Staff>, startDate),
              startDate,
              endDate,
              types,
              getHolidayDatesForEmployee(staffDepartmentMap, a._id as Ref<Staff>, holidays),
              (a) => (a > 0 ? Math.abs(a) : 0)
            )
        }
      ],
      [
        '@publicHoliday',
        {
          key: '',
          label: hr.string.PublicHoliday,
          presenter: HolidayPresenter,
          props: {
            month: startDate ?? getMonth(currentDate, currentDate.getMonth()),
            display: async (staff: Staff, month: Date) =>
              getHolidayDatesForEmployee(staffDepartmentMap, staff._id, await getHolidays(month))
                .map((date) => date.getDate())
                .join(' ')
          }
        }
      ],
      ...typevals
    ])
  }

  async function createConfig (
    descr: Viewlet,
    preference: ViewletPreference | undefined,
    month: Date
  ): Promise<(string | BuildModelKey)[]> {
    const base = preference?.config ?? descr.config
    const result: (string | BuildModelKey)[] = []
    const overrideConfig = await getOverrideConfig(month)

    for (const key of [...base, ...overrideConfig.values()]) {
      if (typeof key === 'string') {
        result.push(overrideConfig.get(key) ?? key)
      } else {
        result.push(overrideConfig.get(key.key) ?? key)
      }
    }
    return result
  }
</script>

{#if departmentStaff.length}
  {#if loading}
    <Loading />
  {:else if viewlet}
    {#await createConfig(viewlet, preference, month) then config}
      <TableBrowser
        tableId={'exportableData'}
        _class={hr.mixin.Staff}
        query={{ _id: { $in: departmentStaff.map((it) => it._id) } }}
        {config}
        options={viewlet.options}
      />
    {/await}
  {/if}
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}
