# Matrice initiale des permissions

**Proposition documentaire de l’étape 6 ; aucun rôle ni droit n’est seedé.** Les codes et gardes sont définis dans [authorization-model.md](authorization-model.md). Cette matrice représente les futurs liens `role_permissions` ; elle ne dispense jamais de vérifier le contexte, l’état et la ressource. `Autonome` n’est pas un rôle de la table `roles` : ses accès `SELF` relèvent de la propriété du tenant personnel.

Légende : `P` = opération PLATFORM explicitement prévue ; `S` = école du membership actif ; `A` = classe affectée activement ; `E` = inscription active de l’étudiant / propre ressource ; `O` = auteur du cours **en plus** des autres gardes ; `G(A)` = grant individuel positif et classe affectée ; `—` = aucun droit du rôle. Les cellules `P`, `S`, `A`, `E` indiquent un **maximum**, jamais un accès automatique à toute donnée de ce périmètre. Un code `manage` couvre exactement les opérations énumérées dans le catalogue.

## Permissions de plateforme

| Permission canonique | STUDENT | TEACHER | SCHOOL_ADMIN | SUPER_ADMIN |
| --- | :---: | :---: | :---: | :---: |
| `platform:schools:read` | — | — | — | P |
| `platform:schools:create` | — | — | — | P |
| `platform:schools:update` | — | — | — | P |
| `platform:schools:suspend` | — | — | — | P |
| `platform:school_admins:assign` | — | — | — | P |
| `platform:users:read` | — | — | — | P |
| `platform:users:suspend` | — | — | — | P |
| `platform:library:manage` | — | — | — | P |
| `platform:languages:manage` | — | — | — | P |
| `platform:levels:manage` | — | — | — | P |
| `platform:settings:manage` | — | — | — | P |
| `platform:analytics:read` | — | — | — | P |

Une permission PLATFORM ne devient pas une permission SCHOOL. La liste des écoles et les agrégats globaux n’exposent pas les messages IA, résultats individuels ou identités complètes sans opération support dédiée, encore non décidée.

## Permissions scolaires

| Permission canonique | STUDENT | TEACHER | SCHOOL_ADMIN | SUPER_ADMIN |
| --- | :---: | :---: | :---: | :---: |
| `school:students:read` | — | A | S | — |
| `school:students:create` | — | G(A) | S | — |
| `school:students:import` | — | G(A) | S | — |
| `school:students:manage` | — | — | S | — |
| `school:teachers:read` | — | — | S | — |
| `school:teachers:manage` | — | — | S | — |
| `school:classes:read` | E | A | S | — |
| `school:classes:manage` | — | — | S | — |
| `school:groups:read` | E | A | S | — |
| `school:groups:manage` | — | — | S | — |
| `school:languages:manage` | — | — | S | — |
| `school:levels:assign` | — | — | S | — |
| `school:content:read` | E | A (brouillons CLASS) / S (publié SCHOOL) | S | — |
| `school:content_class:create` | — | A | S | — |
| `school:content_class:update` | — | A + O | S | — |
| `school:content_class:publish` | — | A + O | S | — |
| `school:content_school:manage` | — | — | S | — |
| `school:content_school:publish` | — | G(A) + O | S | — |
| `school:memberships:assign_role` | — | — | S | — |
| `school:permissions:grant_teacher` | — | — | S | — |
| `school:branding:manage` | — | — | S | — |
| `school:settings:manage` | — | — | S | — |
| `school:invitations:manage` | — | — | S | — |
| `school:progress:read` | E | A | S | — |
| `school:analytics:read` | — | — | S | — |

`G(A)` n’est **pas** dans `role_permissions` de TEACHER. Il proviendra, si attribué, de `school_membership_permission_grants` et restera soumis au membership, à l’affectation et à la ressource. Un School Admin ne peut créer un professeur dans B ni modifier un cours global ; `S` signifie uniquement son école. Le SUPER_ADMIN n’a aucun droit SCHOOL automatique : s’il est aussi membre d’une école, il utilise sa colonne scolaire dans ce contexte.

## Accès `SELF` hors catalogue de permissions

| Politique de propriété, contrôlée par le backend | Étudiant dans une école | Enseignant/admin s’il possède aussi ce contexte d’apprentissage | Apprenant autonome | SUPER_ADMIN sans contexte d’apprentissage |
| --- | --- | --- | --- | --- |
| Lire/modifier ses champs de compte autorisés | Soi | Soi | Soi | Soi |
| Gérer ses langues/parcours et lire son profil contextualisé | Soi, si offre et membership actif | Soi seulement si profil et droit d’apprentissage scolaire établis ; son rôle seul ne suffit pas | Soi dans son tenant PERSONAL | Aucun profil d’autrui par rôle global |
| Lire ses résultats, historique, révisions et signaux de progression | Soi dans le tenant actif | Soi si inscrit comme apprenant dans ce contexte | Soi dans PERSONAL | Aucun résultat d’autrui par rôle global |
| Lire/continuer ses conversations IA brutes | Soi dans le tenant actif | Soi si conversation personnelle propre dans ce contexte | Soi dans PERSONAL | Aucune conversation d’autrui par rôle global |
| Lire les cours GLOBAL publiés et disponibles | Selon langue/parcours | Selon ses usages autorisés | Selon langue/parcours | Selon opération de bibliothèque, sans droit aux dossiers privés |
| Lire les cours SCHOOL/CLASS publiés | Selon école, langue et inscription | Selon membership, publication ou classe affectée | Jamais dans PERSONAL | Jamais par rôle global seul |

La ligne « lire cours » ne donne pas à un étudiant accès à un brouillon. Pour un contenu SCHOOL, `E` exige un membership scolaire actif et l’éligibilité de langue/parcours ; pour un contenu CLASS, il exige en plus l’inscription dans **cette** classe ; pour un groupe, l’inscription dans **ce** groupe lorsque la ressource est ciblée par groupe. Les cours GLOBAL sont publiés par la plateforme ; leur disponibilité effective sera précisée avec le CMS. Les `SELF` scolaires ne peuvent pas être réutilisés dans un tenant personnel ou dans une autre école.

## Exemples de résolution

- Alice possède TEACHER dans A et SCHOOL_ADMIN dans B. `school:classes:manage` vaut `—` en A et `S` en B. Une classe de A ne devient pas modifiable en B.
- Bob possède STUDENT dans A et un tenant personnel. Son profil German A et son profil German personnel sont deux ressources ; `SELF` est recalculé dans le contexte actif.
- Un professeur granté `school:content_school:publish` peut promouvoir son propre cours CLASS tant qu’il est affecté à la classe. Il ne peut ni publier un cours global ni publier le cours d’un autre enseignant.
- Un professeur affecté à Class 1 ne lit pas les résultats d’activités provenant seulement de Class 2, même si un élève suit les deux classes. La future provenance des résultats doit rendre ce filtre possible.
- Un School Admin peut lire les signaux pédagogiques de son école, mais la matrice ne lui donne aucune permission de lire les conversations IA brutes.
