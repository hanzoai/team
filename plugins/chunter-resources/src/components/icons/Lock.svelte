<script lang="ts">
  import { IconSize } from '@hanzo/ui'

  export let size: IconSize
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M13,6.9h-1.1V4.8c0-2.2-1.8-3.9-3.9-3.9c-2.2,0-3.9,1.8-3.9,3.9v2.1H3c-0.9,0-1.6,0.7-1.6,1.6v5.3 c0,0.9,0.7,1.6,1.6,1.6h10c0.9,0,1.6-0.7,1.6-1.6V8.5C14.6,7.6,13.9,6.9,13,6.9z M5.3,4.8c0-1.5,1.2-2.7,2.7-2.7s2.7,1.2,2.7,2.7 v2.1H5.3V4.8z M13.4,13.8c0,0.2-0.2,0.4-0.4,0.4H3c-0.2,0-0.4-0.2-0.4-0.4V8.5c0-0.2,0.2-0.4,0.4-0.4h10c0.2,0,0.4,0.2,0.4,0.4V13.8 z"
  />
</svg>
