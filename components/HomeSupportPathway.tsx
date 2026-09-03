import { LinksGrid } from '@/components/home/LinksGrid'
import { homepageSupportPathways, supportPathwayColors } from '@/lib/data/homepage'

const supportPathways = [...homepageSupportPathways]

/**
 * Primary support choices for /home. The underlying LinksGrid keeps Admin
 * card content edits and registered route-image overrides live at runtime.
 */
export function HomeSupportPathway() {
  return (
    <LinksGrid
      title="Where should I start?"
      subtitle="Open a request for technician action, or start with a known APEN solution."
      items={supportPathways}
      scope="home/pathways"
      colors={supportPathwayColors}
      heightClass="h-32"
      cardMaxWidth="16rem"
    />
  )
}
