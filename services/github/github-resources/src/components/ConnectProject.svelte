<script lang="ts">
  import { Analytics } from '@hanzo/analytics'
  import core, { ClassifierKind, Ref, WithLookup, generateId } from '@hanzo/core'
  import { getEmbeddedLabel, getMetadata, translate } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import task, { TaskType, updateProjectType, type TaskStatusFactory } from '@hanzo/task'
  import tracker, { Project, createStatesData } from '@hanzo/tracker'
  import ui, {
    Button,
    IconChevronDown,
    PaletteColorIndexes,
    getEventPopupPositionElement,
    showPopup
  } from '@hanzo/ui'
  import DropdownLabelsPopup from '@hanzo/ui/src/components/DropdownLabelsPopup.svelte'
  import { GithubIntegration, GithubIntegrationRepository, githubPullRequestStates } from '@hanzo/github'
  import github from '../plugin'

  export let integration: WithLookup<GithubIntegration>
  export let repository: GithubIntegrationRepository
  export let projects: Project[] = []

  /**
   * @public
   */
  export const baseIssueTaskStatuses: TaskStatusFactory[] = [
    {
      category: task.statusCategory.UnStarted,
      statuses: [['Backlog', PaletteColorIndexes.Cloud, tracker.status.Backlog]]
    },
    {
      category: task.statusCategory.Active,
      statuses: [
        ['Coding', PaletteColorIndexes.Porpoise, tracker.status.Coding],
        ['Under review', PaletteColorIndexes.Cerulean, tracker.status.UnderReview]
      ]
    },
    { category: task.statusCategory.Won, statuses: [['Done', PaletteColorIndexes.Grass, tracker.status.Done]] },
    {
      category: task.statusCategory.Lost,
      statuses: [['Canceled', PaletteColorIndexes.Coin, tracker.status.Canceled]]
    }
  ]

  const client = getClient()

  async function assignRepository (project: Ref<Project>): Promise<void> {
    if (project === undefined) {
      return
    }
    const projectInst = projects.find((it) => it._id === project)
    if (projectInst === undefined) {
      return
    }

    Analytics.handleEvent('github.project.connected', { project: projectInst.identifier, repository: repository._id })

    if (!client.getHierarchy().hasMixin(projectInst, github.mixin.GithubProject)) {
      // We need to add GithubProject mixin
      const mixinId = await getClient().createDoc(core.class.Mixin, core.space.Model, {
        extends: github.mixin.GithubIssue,
        kind: ClassifierKind.MIXIN,
        label: getEmbeddedLabel(projectInst.name),
        hidden: false,
        icon: github.icon.Github
      })
      await getClient().createMixin(
        projectInst._id,
        tracker.class.Project,
        core.space.Space,
        github.mixin.GithubProject,
        {
          integration: integration._id,
          repositories: [],
          mixinClass: mixinId,
          mappings: []
        }
      )
    }
    // Check if issue and pull request are missing, we need to add them, and mark both of them as system to prevent deletion.

    const issueId: Ref<TaskType> = generateId()

    await updateProjectType(client, projectInst.type, [
      {
        _id: issueId,
        descriptor: tracker.descriptors.Issue,
        kind: 'both',
        name: await translate(tracker.string.Issue, {}),
        ofClass: tracker.class.Issue,
        statusCategories: baseIssueTaskStatuses.map((it) => it.category),
        statusClass: tracker.class.IssueStatus,
        icon: tracker.icon.Issue,
        color: 0,
        allowedAsChildOf: [issueId],
        factory: createStatesData(baseIssueTaskStatuses)
      },
      {
        _id: generateId(),
        descriptor: github.descriptors.PullRequest,
        kind: 'both',
        name: await translate(github.string.PullRequest, {}),
        ofClass: github.class.GithubPullRequest,
        statusCategories: githubPullRequestStates.map((it) => it.category),
        statusClass: tracker.class.IssueStatus,
        icon: tracker.icon.Issue,
        color: 0,
        allowedAsChildOf: [issueId],
        factory: createStatesData(githubPullRequestStates)
      }
    ])

    const githubProject = client.getHierarchy().as(projectInst, github.mixin.GithubProject)

    void getClient().update(githubProject, {
      $push: { repositories: repository._id }
    })
    void getClient().update(repository, { githubProject: githubProject._id, enabled: true })
  }

  $: allowedProjects = projects.filter(
    (it) =>
      (client.getHierarchy().asIf(it, github.mixin.GithubProject)?.integration ?? integration._id) === integration._id
  )
  async function selectProject (event: MouseEvent): Promise<void> {
    showPopup(
      DropdownLabelsPopup,
      {
        enableSearch: allowedProjects.length > 5,
        items: [
          ...allowedProjects.map((it) => ({ id: `${it._id}`, label: it.name })),
          { id: '#', label: await translate(tracker.string.NewProject, {}) }
        ]
      },
      getEventPopupPositionElement(event),
      (result) => {
        if (result != null) {
          if (result === '#') {
            showPopup(tracker.component.CreateProject, {}, 'center', (prj) => {
              if (prj != null) {
                void assignRepository(prj)
              }
            })
          } else {
            void assignRepository(result)
          }
        }
      }
    )
  }
</script>

<Button
  size={'medium'}
  kind={'primary'}
  label={github.string.LinkToProject}
  labelParams={{ title: getMetadata(ui.metadata.PlatformTitle) }}
  on:click={selectProject}
  iconRight={IconChevronDown}
/>
