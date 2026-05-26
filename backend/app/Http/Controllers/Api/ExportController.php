<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tree;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    /**
     * Helper to authorize editors/viewers.
     */
    private function authorizeViewer($user, $treeId)
    {
        $tree = Tree::findOrFail($treeId);
        if ($tree->owner_id === $user->id) {
            return $tree;
        }

        $collab = $tree->collaborators()->where('user_id', $user->id)->first();
        if ($collab) {
            return $tree;
        }

        abort(response()->json(['message' => 'You do not have access to this family tree.'], 403));
    }

    /**
     * Export the family tree in JSON format.
     */
    public function exportJson(Request $request, string $id)
    {
        $tree = $this->authorizeViewer($request->user(), $id);

        $treeData = Tree::with(['persons', 'relationships', 'customFields'])->findOrFail($id);

        $fileName = str_replace(' ', '_', strtolower($tree->name)) . '_archive.json';

        return response()->json($treeData, 200, [
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Content-Type' => 'application/json',
        ]);
    }

    /**
     * Export the family tree in standard GEDCOM 5.5 format.
     */
    public function exportGedcom(Request $request, string $id)
    {
        $tree = $this->authorizeViewer($request->user(), $id);
        $persons = Person::where('tree_id', $id)->get();
        $relationships = Relationship::where('tree_id', $id)->get();

        $gedcom = [];

        // 1. Header Records
        $gedcom[] = "0 HEAD";
        $gedcom[] = "1 SOUR KINOVA";
        $gedcom[] = "2 VERS 1.0.0";
        $gedcom[] = "2 NAME Kinova Customizable Family Tree Platform";
        $gedcom[] = "1 CHAR UTF-8";
        $gedcom[] = "1 GEDC";
        $gedcom[] = "2 VERS 5.5";
        $gedcom[] = "2 FORM LINEAGE-LINKED";
        $gedcom[] = "1 SUBM @SUBM1@";

        // Submitter record
        $gedcom[] = "0 @SUBM1@ SUBM";
        $gedcom[] = "1 NAME " . $request->user()->name;

        // 2. Individual (INDI) Records
        foreach ($persons as $p) {
            $gedId = "@I" . str_replace('-', '', $p->id) . "@";
            $gedcom[] = "0 {$gedId} INDI";
            $gedcom[] = "1 NAME " . $p->first_name . " /" . ($p->last_name ?? '') . "/";
            
            $sex = 'U';
            if ($p->gender === 'male') {
                $sex = 'M';
            } elseif ($p->gender === 'female') {
                $sex = 'F';
            }
            $gedcom[] = "1 SEX {$sex}";

            if ($p->birth_date) {
                $gedcom[] = "1 BIRT";
                $gedcom[] = "2 DATE " . date('d M Y', strtotime($p->birth_date));
            }
            if ($p->death_date) {
                $gedcom[] = "1 DEAT Y";
                $gedcom[] = "2 DATE " . date('d M Y', strtotime($p->death_date));
            }
            if ($p->biography) {
                $gedcom[] = "1 NOTE " . $p->biography;
            }
            
            // Render custom dynamic_data fields as GEDCOM user-defined tags (EVEN_FACT)
            if ($p->dynamic_data && count($p->dynamic_data) > 0) {
                foreach ($p->dynamic_data as $key => $val) {
                    if ($val) {
                        $tagName = strtoupper(substr(str_replace('_', '', $key), 0, 4));
                        $gedcom[] = "1 _{$tagName} {$val}";
                    }
                }
            }
        }

        // 3. Family (FAM) Records
        // Standardize lineage-linked family groups
        $spouseRelations = $relationships->filter(fn($r) => $r->relation_type === 'spouse');
        $parentRelations = $relationships->filter(fn($r) => $r->relation_type === 'parent');

        // Build spousal family units
        $famIndex = 1;
        $spouseFamilyMap = []; // maps personA_personB or personB_personA to familyId

        foreach ($spouseRelations as $r) {
            $hName = "@I" . str_replace('-', '', $r->person_a) . "@";
            $wName = "@I" . str_replace('-', '', $r->person_b) . "@";
            
            $famId = "@F" . $famIndex . "@";
            $gedcom[] = "0 {$famId} FAM";
            
            // Check person A's gender to place in HUSB/WIFE correctly
            $personA = $persons->firstWhere('id', $r->person_a);
            if ($personA && $personA->gender === 'female') {
                $gedcom[] = "1 HUSB {$wName}";
                $gedcom[] = "1 WIFE {$hName}";
            } else {
                $gedcom[] = "1 HUSB {$hName}";
                $gedcom[] = "1 WIFE {$wName}";
            }
            
            $gedcom[] = "1 MARR";
            
            $spouseFamilyMap[$r->person_a . '_' . $r->person_b] = $famId;
            $spouseFamilyMap[$r->person_b . '_' . $r->person_a] = $famId;
            $famIndex++;
        }

        // Build child-parent links
        // Group children by parent relationships to attach CHIL records
        $childParentGroups = [];
        foreach ($parentRelations as $r) {
            $childParentGroups[$r->person_b][] = $r->person_a; // childId => [parentId1, parentId2, ...]
        }

        foreach ($childParentGroups as $childId => $parentIds) {
            $childGedId = "@I" . str_replace('-', '', $childId) . "@";
            
            // Try to find if parents have a registered spousal family FAM unit
            $attached = false;
            if (count($parentIds) >= 2) {
                $key1 = $parentIds[0] . '_' . $parentIds[1];
                $key2 = $parentIds[1] . '_' . $parentIds[0];
                $famId = $spouseFamilyMap[$key1] ?? ($spouseFamilyMap[$key2] ?? null);
                
                if ($famId) {
                    // Inject CHIL into spouse family
                    $spouseFamIndex = array_search("0 {$famId} FAM", $gedcom);
                    if ($spouseFamIndex !== false) {
                        array_splice($gedcom, $spouseFamIndex + 4, 0, "1 CHIL {$childGedId}");
                        $attached = true;
                    }
                }
            }

            if (!$attached) {
                // If parents aren't linked as spouses in database, create a standalone child-parent family
                $famId = "@F" . $famIndex . "@";
                $gedcom[] = "0 {$famId} FAM";
                foreach ($parentIds as $pId) {
                    $pGedId = "@I" . str_replace('-', '', $pId) . "@";
                    $parent = $persons->firstWhere('id', $pId);
                    if ($parent && $parent->gender === 'female') {
                        $gedcom[] = "1 WIFE {$pGedId}";
                    } else {
                        $gedcom[] = "1 HUSB {$pGedId}";
                    }
                }
                $gedcom[] = "1 CHIL {$childGedId}";
                $famIndex++;
            }
        }

        // 4. Trailer Record
        $gedcom[] = "0 TRLR";

        $gedcomText = implode("\r\n", $gedcom);
        $fileName = str_replace(' ', '_', strtolower($tree->name)) . '.ged';

        return response($gedcomText, 200, [
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }
}
