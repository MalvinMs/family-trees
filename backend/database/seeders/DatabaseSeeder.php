<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tree;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\CustomField;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default User
        $user = User::create([
            'name' => 'Adhi Kartowidjojo',
            'email' => 'admin@kinova.com',
            'password' => Hash::make('password123'),
        ]);

        // 2. Create Default Family Tree
        $tree = Tree::create([
            'owner_id' => $user->id,
            'name' => 'Trah Kartowidjojo (Javanese Heritage)',
            'settings' => [
                'theme' => 'royal_dark',
                'node' => [
                    'shape' => 'card',
                    'border_radius' => 12,
                    'font' => 'serif',
                ],
                'edge' => [
                    'style' => 'smoothstep',
                    'width' => 3,
                ]
            ],
        ]);

        // 3. Create Custom Dynamic Schema Fields
        $cfClan = CustomField::create([
            'tree_id' => $tree->id,
            'field_name' => 'marga_clan',
            'field_type' => 'text',
        ]);

        $cfTitle = CustomField::create([
            'tree_id' => $tree->id,
            'field_name' => 'royal_title',
            'field_type' => 'text',
        ]);

        // 4. Create Persons (Generations 1, 2, 3 with coordinates!)
        // Gen 1: Grandparents
        $grandpa = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Raden Mas',
            'last_name' => 'Kartowidjojo',
            'gender' => 'male',
            'birth_date' => '1920-04-12',
            'death_date' => '1998-11-30',
            'biography' => 'Founder of the family agricultural cooperative and cultural historian in Surakarta.',
            'dynamic_data' => [
                'marga_clan' => 'Kartowidjojo',
                'royal_title' => 'Raden Mas (RM)',
            ],
            'ui_metadata' => ['x' => 250, 'y' => 50],
        ]);

        $grandma = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Siti',
            'last_name' => 'Sumiyati',
            'gender' => 'female',
            'birth_date' => '1925-08-19',
            'death_date' => '2012-05-14',
            'biography' => 'Beloved matriarch, known for her mastery of traditional batik tulis designs.',
            'dynamic_data' => [
                'marga_clan' => 'N/A',
                'royal_title' => 'Raden Roro (RRo)',
            ],
            'ui_metadata' => ['x' => 550, 'y' => 50],
        ]);

        // Gen 2: Children
        $son = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Bambang',
            'last_name' => 'Kartowidjojo',
            'gender' => 'male',
            'birth_date' => '1952-10-05',
            'death_date' => null,
            'biography' => 'Academic lecturer in cultural heritage. Retired and resides in Yogyakarta.',
            'dynamic_data' => [
                'marga_clan' => 'Kartowidjojo',
                'royal_title' => 'Raden Mas (RM)',
            ],
            'ui_metadata' => ['x' => 400, 'y' => 300],
        ]);

        $daughterInLaw = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Sri',
            'last_name' => 'Retno',
            'gender' => 'female',
            'birth_date' => '1958-03-24',
            'death_date' => null,
            'biography' => 'Retired high school educator and classical Javanese gamelan performer.',
            'dynamic_data' => [
                'marga_clan' => 'Yudhodiningrat',
                'royal_title' => 'Raden Ajeng (RA)',
            ],
            'ui_metadata' => ['x' => 700, 'y' => 300],
        ]);

        // Gen 3: Grandchildren
        $grandson = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Adhi',
            'last_name' => 'Cahyo',
            'gender' => 'male',
            'birth_date' => '1986-07-15',
            'death_date' => null,
            'biography' => 'Software engineer in Jakarta. Passionate about digitization of ancestry records.',
            'dynamic_data' => [
                'marga_clan' => 'Kartowidjojo',
                'royal_title' => 'Raden Mas (RM)',
            ],
            'ui_metadata' => ['x' => 300, 'y' => 550],
        ]);

        $granddaughter = Person::create([
            'tree_id' => $tree->id,
            'first_name' => 'Dwi',
            'last_name' => 'Arum',
            'gender' => 'female',
            'birth_date' => '1991-12-01',
            'death_date' => null,
            'biography' => 'Architect and urban planner, active in preserving historical buildings.',
            'dynamic_data' => [
                'marga_clan' => 'Kartowidjojo',
                'royal_title' => 'Raden Roro (RRo)',
            ],
            'ui_metadata' => ['x' => 600, 'y' => 550],
        ]);

        // 5. Create Relationships (Spouse & Parent Edges)
        // G1 Spouse
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $grandpa->id,
            'person_b' => $grandma->id,
            'relation_type' => 'spouse',
        ]);

        // Parents G1 to G2
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $grandpa->id,
            'person_b' => $son->id,
            'relation_type' => 'parent',
        ]);
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $grandma->id,
            'person_b' => $son->id,
            'relation_type' => 'parent',
        ]);

        // G2 Spouse
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $son->id,
            'person_b' => $daughterInLaw->id,
            'relation_type' => 'spouse',
        ]);

        // Parents G2 to G3 (Cahyo)
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $son->id,
            'person_b' => $grandson->id,
            'relation_type' => 'parent',
        ]);
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $daughterInLaw->id,
            'person_b' => $grandson->id,
            'relation_type' => 'parent',
        ]);

        // Parents G2 to G3 (Arum)
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $son->id,
            'person_b' => $granddaughter->id,
            'relation_type' => 'parent',
        ]);
        Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $daughterInLaw->id,
            'person_b' => $granddaughter->id,
            'relation_type' => 'parent',
        ]);
    }
}
