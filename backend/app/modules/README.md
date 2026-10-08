# Modules métier

Les dossiers existants sont vides. Ajouter les domaines progressivement selon [la correspondance complète](../../../docs/project-structure.md). Suivre la [convention unique par module](../../../docs/code-conventions.md) : `router.py`, `schemas.py`, `service.py`, `repository.py`, `models.py`, puis `public.py` seulement si un autre module a besoin d’un contrat. Ne créer que les fichiers utiles à la fonctionnalité en cours. Respecter le contexte tenant dans chaque accès et garder le métier hors des répertoires transverses.
