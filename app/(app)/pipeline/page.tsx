import { listPipelineBoard } from "@/app/actions/pipeline";
import { PipelineClient } from "@/components/pipeline/PipelineClient";

export default async function PipelinePage() {
  const cards = await listPipelineBoard();
  return <PipelineClient initialCards={cards} />;
}
