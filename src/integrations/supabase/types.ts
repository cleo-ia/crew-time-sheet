export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achats_chantier: {
        Row: {
          chantier_id: string
          created_at: string
          date: string
          facture_name: string | null
          facture_path: string | null
          fournisseur: string | null
          id: string
          montant: number
          nom: string
          prix_unitaire: number | null
          quantite: number | null
          tache_id: string | null
          type_cout: string
          unite: string | null
          updated_at: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          date?: string
          facture_name?: string | null
          facture_path?: string | null
          fournisseur?: string | null
          id?: string
          montant?: number
          nom: string
          prix_unitaire?: number | null
          quantite?: number | null
          tache_id?: string | null
          type_cout?: string
          unite?: string | null
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          date?: string
          facture_name?: string | null
          facture_path?: string | null
          fournisseur?: string | null
          id?: string
          montant?: number
          nom?: string
          prix_unitaire?: number | null
          quantite?: number | null
          tache_id?: string | null
          type_cout?: string
          unite?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affectations: {
        Row: {
          chantier_id: string
          created_at: string
          date_debut: string
          date_fin: string | null
          id: string
          macon_id: string
          updated_at: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          date_debut: string
          date_fin?: string | null
          id?: string
          macon_id: string
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          id?: string
          macon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_macon_id_fkey"
            columns: ["macon_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_macon_id_fkey"
            columns: ["macon_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      affectations_backup: {
        Row: {
          chantier_id: string | null
          chef_id: string | null
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          id: string | null
          macon_id: string | null
          updated_at: string | null
        }
        Insert: {
          chantier_id?: string | null
          chef_id?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string | null
          macon_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string | null
          chef_id?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string | null
          macon_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affectations_finisseurs_jours: {
        Row: {
          chantier_id: string
          conducteur_id: string
          created_at: string
          date: string
          finisseur_id: string
          id: string
          semaine: string
          updated_at: string
        }
        Insert: {
          chantier_id: string
          conducteur_id: string
          created_at?: string
          date: string
          finisseur_id: string
          id?: string
          semaine: string
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          conducteur_id?: string
          created_at?: string
          date?: string
          finisseur_id?: string
          id?: string
          semaine?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_finisseurs_jours_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_finisseurs_jours_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_finisseurs_jours_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_finisseurs_jours_finisseur_id_fkey"
            columns: ["finisseur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_finisseurs_jours_finisseur_id_fkey"
            columns: ["finisseur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers: {
        Row: {
          actif: boolean | null
          adresse: string | null
          chef_id: string | null
          client: string | null
          code_chantier: string | null
          conducteur_id: string | null
          created_at: string
          created_by: string
          date_debut: string | null
          date_fin: string | null
          description: string | null
          id: string
          libelle: string | null
          montant_vendu: number | null
          nom: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean | null
          adresse?: string | null
          chef_id?: string | null
          client?: string | null
          code_chantier?: string | null
          conducteur_id?: string | null
          created_at?: string
          created_by: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          libelle?: string | null
          montant_vendu?: number | null
          nom: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean | null
          adresse?: string | null
          chef_id?: string | null
          client?: string | null
          code_chantier?: string | null
          conducteur_id?: string | null
          created_at?: string
          created_by?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          libelle?: string | null
          montant_vendu?: number | null
          nom?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers_documents: {
        Row: {
          chantier_id: string
          created_at: string
          dossier_id: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
          nom: string
          uploaded_by: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          dossier_id?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
          nom: string
          uploaded_by?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          dossier_id?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          nom?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_documents_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "chantiers_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers_dossiers: {
        Row: {
          chantier_id: string
          created_at: string
          id: string
          nom: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          id?: string
          nom: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          id?: string
          nom?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_dossiers_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_dossiers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chantiers_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      conducteurs_chefs: {
        Row: {
          chef_id: string
          conducteur_id: string
          created_at: string
          id: string
        }
        Insert: {
          chef_id: string
          conducteur_id: string
          created_at?: string
          id?: string
        }
        Update: {
          chef_id?: string
          conducteur_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conducteurs_chefs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteurs_chefs_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches: {
        Row: {
          absences_export_override: Json | null
          acomptes: string | null
          autres_elements_export: string | null
          chantier_id: string | null
          commentaire_rh: string | null
          commentaire_saisie: string | null
          created_at: string
          date: string | null
          id: string
          notes_paie: string | null
          notification_conducteur_envoyee_at: string | null
          prets: string | null
          regularisation_m1_export: string | null
          saisie_du_mois: string | null
          salarie_id: string | null
          semaine: string | null
          statut: Database["public"]["Enums"]["statut_fiche"]
          total_heures: number
          total_saisie: string | null
          trajets_export_override: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          absences_export_override?: Json | null
          acomptes?: string | null
          autres_elements_export?: string | null
          chantier_id?: string | null
          commentaire_rh?: string | null
          commentaire_saisie?: string | null
          created_at?: string
          date?: string | null
          id?: string
          notes_paie?: string | null
          notification_conducteur_envoyee_at?: string | null
          prets?: string | null
          regularisation_m1_export?: string | null
          saisie_du_mois?: string | null
          salarie_id?: string | null
          semaine?: string | null
          statut?: Database["public"]["Enums"]["statut_fiche"]
          total_heures?: number
          total_saisie?: string | null
          trajets_export_override?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          absences_export_override?: Json | null
          acomptes?: string | null
          autres_elements_export?: string | null
          chantier_id?: string | null
          commentaire_rh?: string | null
          commentaire_saisie?: string | null
          created_at?: string
          date?: string | null
          id?: string
          notes_paie?: string | null
          notification_conducteur_envoyee_at?: string | null
          prets?: string | null
          regularisation_m1_export?: string | null
          saisie_du_mois?: string | null
          salarie_id?: string | null
          semaine?: string | null
          statut?: Database["public"]["Enums"]["statut_fiche"]
          total_heures?: number
          total_saisie?: string | null
          trajets_export_override?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiches_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_salarie_id_fkey"
            columns: ["salarie_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_salarie_id_fkey"
            columns: ["salarie_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_jours: {
        Row: {
          autres_elements: string | null
          code_chantier_du_jour: string | null
          code_trajet: string | null
          commentaire: string | null
          created_at: string
          date: string
          fiche_id: string
          heure_debut: string | null
          heure_fin: string | null
          heures: number
          HI: number | null
          HNORM: number | null
          id: string
          PA: boolean | null
          pause_minutes: number
          regularisation_m1: string | null
          T: number | null
          total_jour: number | null
          trajet_perso: boolean | null
          type_absence: Database["public"]["Enums"]["type_absence"] | null
          updated_at: string
          ville_du_jour: string | null
        }
        Insert: {
          autres_elements?: string | null
          code_chantier_du_jour?: string | null
          code_trajet?: string | null
          commentaire?: string | null
          created_at?: string
          date: string
          fiche_id: string
          heure_debut?: string | null
          heure_fin?: string | null
          heures?: number
          HI?: number | null
          HNORM?: number | null
          id?: string
          PA?: boolean | null
          pause_minutes?: number
          regularisation_m1?: string | null
          T?: number | null
          total_jour?: number | null
          trajet_perso?: boolean | null
          type_absence?: Database["public"]["Enums"]["type_absence"] | null
          updated_at?: string
          ville_du_jour?: string | null
        }
        Update: {
          autres_elements?: string | null
          code_chantier_du_jour?: string | null
          code_trajet?: string | null
          commentaire?: string | null
          created_at?: string
          date?: string
          fiche_id?: string
          heure_debut?: string | null
          heure_fin?: string | null
          heures?: number
          HI?: number | null
          HNORM?: number | null
          id?: string
          PA?: boolean | null
          pause_minutes?: number
          regularisation_m1?: string | null
          T?: number | null
          total_jour?: number | null
          trajet_perso?: boolean | null
          type_absence?: Database["public"]["Enums"]["type_absence"] | null
          updated_at?: string
          ville_du_jour?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiches_jours_fiche_id_fkey"
            columns: ["fiche_id"]
            isOneToOne: false
            referencedRelation: "fiches"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_transport: {
        Row: {
          chantier_id: string | null
          created_at: string
          fiche_id: string
          id: string
          semaine: string
          updated_at: string
        }
        Insert: {
          chantier_id?: string | null
          created_at?: string
          fiche_id: string
          id?: string
          semaine: string
          updated_at?: string
        }
        Update: {
          chantier_id?: string | null
          created_at?: string
          fiche_id?: string
          id?: string
          semaine?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_transport_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_fiche_id_fkey"
            columns: ["fiche_id"]
            isOneToOne: true
            referencedRelation: "fiches"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_transport_finisseurs: {
        Row: {
          created_at: string
          fiche_id: string
          finisseur_id: string
          id: string
          semaine: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiche_id: string
          finisseur_id: string
          id?: string
          semaine: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiche_id?: string
          finisseur_id?: string
          id?: string
          semaine?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_transport_finisseurs_fiche_id_fkey"
            columns: ["fiche_id"]
            isOneToOne: false
            referencedRelation: "fiches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_finisseur_id_fkey"
            columns: ["finisseur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_finisseur_id_fkey"
            columns: ["finisseur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_transport_finisseurs_jours: {
        Row: {
          conducteur_matin_id: string | null
          conducteur_soir_id: string | null
          created_at: string
          date: string
          fiche_transport_finisseur_id: string
          id: string
          immatriculation: string | null
          updated_at: string
        }
        Insert: {
          conducteur_matin_id?: string | null
          conducteur_soir_id?: string | null
          created_at?: string
          date: string
          fiche_transport_finisseur_id: string
          id?: string
          immatriculation?: string | null
          updated_at?: string
        }
        Update: {
          conducteur_matin_id?: string | null
          conducteur_soir_id?: string | null
          created_at?: string
          date?: string
          fiche_transport_finisseur_id?: string
          id?: string
          immatriculation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_transport_finisseurs_j_fiche_transport_finisseur_id_fkey"
            columns: ["fiche_transport_finisseur_id"]
            isOneToOne: false
            referencedRelation: "fiches_transport_finisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_jours_conducteur_matin_id_fkey"
            columns: ["conducteur_matin_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_jours_conducteur_matin_id_fkey"
            columns: ["conducteur_matin_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_jours_conducteur_soir_id_fkey"
            columns: ["conducteur_soir_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_finisseurs_jours_conducteur_soir_id_fkey"
            columns: ["conducteur_soir_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_transport_jours: {
        Row: {
          conducteur_aller_id: string | null
          conducteur_retour_id: string | null
          created_at: string
          date: string
          fiche_transport_id: string
          id: string
          immatriculation: string | null
          periode: string
          updated_at: string
        }
        Insert: {
          conducteur_aller_id?: string | null
          conducteur_retour_id?: string | null
          created_at?: string
          date: string
          fiche_transport_id: string
          id?: string
          immatriculation?: string | null
          periode: string
          updated_at?: string
        }
        Update: {
          conducteur_aller_id?: string | null
          conducteur_retour_id?: string | null
          created_at?: string
          date?: string
          fiche_transport_id?: string
          id?: string
          immatriculation?: string | null
          periode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_transport_jours_conducteur_aller_id_fkey"
            columns: ["conducteur_aller_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_jours_conducteur_aller_id_fkey"
            columns: ["conducteur_aller_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_jours_conducteur_retour_id_fkey"
            columns: ["conducteur_retour_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_jours_conducteur_retour_id_fkey"
            columns: ["conducteur_retour_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_transport_jours_fiche_transport_id_fkey"
            columns: ["fiche_transport_id"]
            isOneToOne: false
            referencedRelation: "fiches_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          conducteur_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          meta: Json | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          conducteur_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          meta?: Json | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          conducteur_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          meta?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      periodes_cloturees: {
        Row: {
          cloturee_par: string | null
          created_at: string | null
          date_cloture: string
          id: string
          motif: string | null
          nb_fiches: number | null
          nb_salaries: number | null
          periode: string
          semaine_debut: string
          semaine_fin: string | null
          total_heures: number | null
          updated_at: string | null
        }
        Insert: {
          cloturee_par?: string | null
          created_at?: string | null
          date_cloture?: string
          id?: string
          motif?: string | null
          nb_fiches?: number | null
          nb_salaries?: number | null
          periode: string
          semaine_debut: string
          semaine_fin?: string | null
          total_heures?: number | null
          updated_at?: string | null
        }
        Update: {
          cloturee_par?: string | null
          created_at?: string | null
          date_cloture?: string
          id?: string
          motif?: string | null
          nb_fiches?: number | null
          nb_salaries?: number | null
          periode?: string
          semaine_debut?: string
          semaine_fin?: string | null
          total_heures?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodes_cloturees_cloturee_par_fkey"
            columns: ["cloturee_par"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodes_cloturees_cloturee_par_fkey"
            columns: ["cloturee_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          disabled: boolean
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rappels_historique: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          executed_at: string
          execution_mode: string
          id: string
          nb_destinataires: number
          nb_echecs: number
          nb_succes: number
          triggered_by: string | null
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          execution_mode: string
          id?: string
          nb_destinataires?: number
          nb_echecs?: number
          nb_succes?: number
          triggered_by?: string | null
          type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          execution_mode?: string
          id?: string
          nb_destinataires?: number
          nb_echecs?: number
          nb_succes?: number
          triggered_by?: string | null
          type?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string
          fiche_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          signature_data: string | null
          signed_at: string
          signed_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiche_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          signature_data?: string | null
          signed_at?: string
          signed_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiche_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          signature_data?: string | null
          signed_at?: string
          signed_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_fiche_id_fkey"
            columns: ["fiche_id"]
            isOneToOne: false
            referencedRelation: "fiches"
            referencedColumns: ["id"]
          },
        ]
      }
      taches_chantier: {
        Row: {
          chantier_id: string
          couleur: string | null
          created_at: string
          date_debut: string
          date_fin: string
          description: string | null
          heures_estimees: number | null
          heures_realisees: number | null
          id: string
          montant_vendu: number | null
          nom: string
          ordre: number
          statut: Database["public"]["Enums"]["statut_tache"]
          updated_at: string
        }
        Insert: {
          chantier_id: string
          couleur?: string | null
          created_at?: string
          date_debut: string
          date_fin: string
          description?: string | null
          heures_estimees?: number | null
          heures_realisees?: number | null
          id?: string
          montant_vendu?: number | null
          nom: string
          ordre?: number
          statut?: Database["public"]["Enums"]["statut_tache"]
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          couleur?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          description?: string | null
          heures_estimees?: number | null
          heures_realisees?: number | null
          id?: string
          montant_vendu?: number | null
          nom?: string
          ordre?: number
          statut?: Database["public"]["Enums"]["statut_tache"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taches_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      taches_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          nom: string
          tache_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          nom: string
          tache_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          nom?: string
          tache_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taches_documents_tache_id_fkey"
            columns: ["tache_id"]
            isOneToOne: false
            referencedRelation: "taches_chantier"
            referencedColumns: ["id"]
          },
        ]
      }
      todos_chantier: {
        Row: {
          afficher_planning: boolean
          chantier_id: string
          created_at: string
          created_by: string | null
          date_echeance: string | null
          description: string | null
          id: string
          nom: string
          priorite: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          afficher_planning?: boolean
          chantier_id: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          description?: string | null
          id?: string
          nom: string
          priorite?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          afficher_planning?: boolean
          chantier_id?: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          description?: string | null
          id?: string
          nom?: string
          priorite?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      todos_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          nom: string
          todo_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          nom: string
          todo_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          nom?: string
          todo_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_documents_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos_chantier"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          has_completed_onboarding: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          has_completed_onboarding?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          has_completed_onboarding?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utilisateurs: {
        Row: {
          agence_interim: string | null
          auth_user_id: string | null
          created_at: string
          degre: string | null
          echelon: string | null
          email: string | null
          forfait_jours: boolean | null
          heures_supp_mensualisees: number | null
          horaire: string | null
          id: string
          libelle_emploi: string | null
          matricule: string | null
          niveau: string | null
          nom: string | null
          prenom: string | null
          role_metier: Database["public"]["Enums"]["role_metier_type"] | null
          salaire: number | null
          statut: string | null
          taux_horaire: number | null
          type_contrat: string | null
          updated_at: string
        }
        Insert: {
          agence_interim?: string | null
          auth_user_id?: string | null
          created_at?: string
          degre?: string | null
          echelon?: string | null
          email?: string | null
          forfait_jours?: boolean | null
          heures_supp_mensualisees?: number | null
          horaire?: string | null
          id: string
          libelle_emploi?: string | null
          matricule?: string | null
          niveau?: string | null
          nom?: string | null
          prenom?: string | null
          role_metier?: Database["public"]["Enums"]["role_metier_type"] | null
          salaire?: number | null
          statut?: string | null
          taux_horaire?: number | null
          type_contrat?: string | null
          updated_at?: string
        }
        Update: {
          agence_interim?: string | null
          auth_user_id?: string | null
          created_at?: string
          degre?: string | null
          echelon?: string | null
          email?: string | null
          forfait_jours?: boolean | null
          heures_supp_mensualisees?: number | null
          horaire?: string | null
          id?: string
          libelle_emploi?: string | null
          matricule?: string | null
          niveau?: string | null
          nom?: string | null
          prenom?: string | null
          role_metier?: Database["public"]["Enums"]["role_metier_type"] | null
          salaire?: number | null
          statut?: string | null
          taux_horaire?: number | null
          type_contrat?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          immatriculation: string
          marque: string | null
          modele: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id?: string
          immatriculation: string
          marque?: string | null
          modele?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          immatriculation?: string
          marque?: string | null
          modele?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      affectations_view: {
        Row: {
          chantier_id: string | null
          chantier_nom: string | null
          chef_id: string | null
          chef_nom: string | null
          chef_prenom: string | null
          code_chantier: string | null
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          id: string | null
          macon_email: string | null
          macon_id: string | null
          macon_nom: string | null
          macon_prenom: string | null
          updated_at: string | null
          ville: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affectations_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_macon_id_fkey"
            columns: ["macon_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_macon_id_fkey"
            columns: ["macon_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      me: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string | null
          nom: string | null
          prenom: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_lots_pret_conducteur: {
        Row: {
          chantier_id: string | null
          chef_id: string | null
          conducteur_id: string | null
          nb_non_prets: number | null
          nb_prets: number | null
          notif_exists: string | null
          semaine: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiches_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      expire_old_invitations: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rh" | "conducteur" | "chef"
      role_metier_type:
        | "macon"
        | "finisseur"
        | "grutier"
        | "chef"
        | "conducteur"
      statut_fiche:
        | "BROUILLON"
        | "EN_SIGNATURE"
        | "VALIDE_CHEF"
        | "VALIDE_CONDUCTEUR"
        | "ENVOYE_RH"
        | "AUTO_VALIDE"
      statut_tache: "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD"
      type_absence:
        | "CP"
        | "RTT"
        | "AM"
        | "MP"
        | "AT"
        | "CONGE_PARENTAL"
        | "HI"
        | "CPSS"
        | "ABS_INJ"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "rh", "conducteur", "chef"],
      role_metier_type: ["macon", "finisseur", "grutier", "chef", "conducteur"],
      statut_fiche: [
        "BROUILLON",
        "EN_SIGNATURE",
        "VALIDE_CHEF",
        "VALIDE_CONDUCTEUR",
        "ENVOYE_RH",
        "AUTO_VALIDE",
      ],
      statut_tache: ["A_FAIRE", "EN_COURS", "TERMINE", "EN_RETARD"],
      type_absence: [
        "CP",
        "RTT",
        "AM",
        "MP",
        "AT",
        "CONGE_PARENTAL",
        "HI",
        "CPSS",
        "ABS_INJ",
      ],
    },
  },
} as const
