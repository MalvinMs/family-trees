<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PersonCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public $person)
    {
        // Select specific fields to minimize payload size and avoid JSONB dynamic_data bloat
        if (is_object($this->person)) {
            $this->person = $this->person->only([
                'id', 'tree_id', 'first_name', 'last_name', 
                'gender', 'birth_date', 'death_date', 'biography', 
                'ui_metadata'
            ]);
        }
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $treeId = is_array($this->person) ? $this->person['tree_id'] : $this->person->tree_id;
        return [
            new PrivateChannel('tree.' . $treeId),
        ];
    }
}
