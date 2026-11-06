import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WSO2_SOURCE_LABELS, type Wso2Source } from "@/config/wso2-sources";
import { useSourceDescription } from "@/hooks";

/** Source name for the Source dropdown items; its description shows in a tooltip on hover. */
export function SourceOption({ source }: { source: Wso2Source }) {
  const describe = useSourceDescription();
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="flex-1" />}>{WSO2_SOURCE_LABELS[source]}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={16}>
        {describe(source)}
      </TooltipContent>
    </Tooltip>
  );
}
