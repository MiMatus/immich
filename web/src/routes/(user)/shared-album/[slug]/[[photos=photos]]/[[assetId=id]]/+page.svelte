<script lang="ts">
  import ManageSharedLinkPage from '#lib/components/pages/ManageSharedLinkPage.svelte';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  let { data }: Props = $props();
</script>

<ManageSharedLinkPage {data} />
