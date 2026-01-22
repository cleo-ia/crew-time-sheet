import { supabase } from "@/integrations/supabase/client";

/**
 * Get or create the "Factures" folder for a chantier
 * Returns the folder ID
 */
export async function getOrCreateFacturesDossier(chantierId: string): Promise<string> {
  // Check if "Factures" folder already exists
  const { data: existingFolder } = await supabase
    .from("chantiers_dossiers")
    .select("id")
    .eq("chantier_id", chantierId)
    .eq("nom", "Factures")
    .is("parent_id", null)
    .maybeSingle();

  if (existingFolder) {
    return existingFolder.id;
  }

  // Create the folder (entreprise_id auto-filled by trigger set_entreprise_from_chantier)
  const { data: newFolder, error } = await supabase
    .from("chantiers_dossiers")
    .insert({
      chantier_id: chantierId,
      nom: "Factures",
      parent_id: null,
    } as any)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erreur lors de la création du dossier Factures: ${error.message}`);
  }

  return newFolder.id;
}

/**
 * Add a file to the chantiers_documents table in the Factures folder
 */
export async function addFactureToDocuments(
  chantierId: string,
  fileName: string,
  filePath: string,
  fileType: string,
  fileSize: number
): Promise<void> {
  const dossierId = await getOrCreateFacturesDossier(chantierId);

  // Check if document already exists to avoid duplicates
  const { data: existing } = await supabase
    .from("chantiers_documents")
    .select("id")
    .eq("chantier_id", chantierId)
    .eq("file_path", filePath)
    .maybeSingle();

  if (existing) {
    return; // Already exists, skip
  }

  const { error } = await supabase
    .from("chantiers_documents")
    .insert({
      chantier_id: chantierId,
      nom: fileName,
      file_path: filePath,
      file_type: fileType,
      file_size: fileSize,
      dossier_id: dossierId,
    });

  if (error) {
    console.error("Erreur lors de l'ajout du document facture:", error);
  }
}

/**
 * Remove a file from chantiers_documents by file_path
 */
export async function removeFactureFromDocuments(filePath: string): Promise<void> {
  const { error } = await supabase
    .from("chantiers_documents")
    .delete()
    .eq("file_path", filePath);

  if (error) {
    console.error("Erreur lors de la suppression du document facture:", error);
  }
}
