<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomField;
use App\Models\Tree;
use Illuminate\Http\Request;

class CustomFieldController extends Controller
{
    /**
     * Display a listing of the custom fields for a specific tree.
     */
    public function index(Request $request)
    {
        $request->validate([
            'tree_id' => ['required', 'uuid', 'exists:trees,id']
        ]);

        $user = $request->user();

        // Authorize that the user owns the tree or is a collaborator
        $tree = Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                    });
            })
            ->findOrFail($request->tree_id);

        $fields = $tree->customFields()->latest()->get();
        return response()->json($fields);
    }

    /**
     * Store a newly created custom field.
     */
    public function store(Request $request)
    {
        $request->validate([
            'tree_id' => ['required', 'uuid', 'exists:trees,id'],
            'field_name' => ['required', 'string', 'max:255'],
            'field_type' => ['required', 'string', 'in:text,date,dropdown,tag,file,image'],
            'validation_rules' => ['nullable', 'array'],
        ]);

        $user = $request->user();

        // Authorize that the user owns the tree or is an editor collaborator
        $tree = Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->where('role', 'editor');
                    });
            })
            ->findOrFail($request->tree_id);

        $customField = CustomField::create([
            'tree_id' => $tree->id,
            'field_name' => $request->field_name,
            'field_type' => $request->field_type,
            'validation_rules' => $request->validation_rules ?? [],
        ]);

        return response()->json($customField, 201);
    }

    /**
     * Update the specified custom field.
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'field_name' => ['required', 'string', 'max:255'],
            'validation_rules' => ['nullable', 'array'],
        ]);

        $customField = CustomField::findOrFail($id);
        $user = $request->user();

        // Authorize that the user owns the tree or is an editor collaborator
        $tree = Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->where('role', 'editor');
                    });
            })
            ->findOrFail($customField->tree_id);

        $oldName = $customField->field_name;
        $newName = $request->field_name;

        // If the custom field key name changed, migrate JSON keys in persons dynamic_data columns
        if ($newName !== $oldName) {
            foreach ($tree->persons as $person) {
                $dynamicData = $person->dynamic_data ?? [];
                if (array_key_exists($oldName, $dynamicData)) {
                    $dynamicData[$newName] = $dynamicData[$oldName];
                    unset($dynamicData[$oldName]);
                    $person->update(['dynamic_data' => $dynamicData]);
                }
            }
        }

        $customField->update([
            'field_name' => $newName,
            'validation_rules' => $request->validation_rules ?? [],
        ]);

        return response()->json($customField);
    }

    /**
     * Remove the specified custom field.
     */
    public function destroy(Request $request, string $id)
    {
        $customField = CustomField::findOrFail($id);
        $user = $request->user();

        // Authorize that the user owns the tree or is an editor collaborator this custom field belongs to
        Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->where('role', 'editor');
                    });
            })
            ->findOrFail($customField->tree_id);

        $customField->delete();

        return response()->json(['message' => 'Custom field deleted successfully']);
    }
}
