import { createClient } from "@/lib/supabase/client";
import type { PageGraph } from "@/lib/lab/persistence";

export interface TemplateRow {
  id: string;
  title: string;
  description: string;
  graph: PageGraph;
  import_count: number;
  created_at: string;
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_templates")
    .select("id,title,description,graph,import_count,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as TemplateRow[];
}

export async function publishTemplate(
  title: string,
  description: string,
  page: PageGraph,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("lab_templates")
    .insert({ author_id: user.id, title, description, graph: page });
  return !error;
}

export async function bumpTemplateImport(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("increment_template_import", { t: id });
}
