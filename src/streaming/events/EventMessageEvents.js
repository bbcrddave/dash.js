/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import EventsBase from '../../core/events/EventsBase';

/**
 * @classdesc Public facing external events. All public events will be
 * aggregated into the MediaPlayerEvents Class and can be accessed via
 * MediaPlayer.events
 */
class EventMessageEvents extends EventsBase {

    /**
     * @class
     */
    constructor () {
        super();
        /**
         * An EventStream was added.
         * @event EventMessageEvents#EVENTSTREAM_ADDED
         */
        this.EVENTSTREAM_ADDED = 'eventStreamAdded';

        /**
         * An EventStream not intended for external consumption was added.
         * @event EventMessageEvents#INTERNAL_EVENTSTREAM_ADDED
         */
        this.INTERNAL_EVENTSTREAM_ADDED = 'internalEventStreamAdded';

        /**
         * An EventStream was removed.
         * @event EventMessageEvents#EVENTSTREAM_REMOVED
         */
        this.EVENTSTREAM_REMOVED = 'eventStreamRemoved';

        /**
         * An EventStream not intended for external consumption was removed.
         * @event EventMessageEvents#INTERNAL_EVENTSTREAM_REMOVED
         */
        this.INTERNAL_EVENTSTREAM_REMOVED = 'internalEventStreamRemoved';

        /**
         * An Event became active
         * @event EventMessageEvents#EVENT_STARTED
         */
        this.EVENT_STARTED = 'eventStarted';

        /**
         * An internal event became active.
         * @event EventMessageEvents#INTERNAL_EVENT_STARTED
         */
        this.INTERNAL_EVENT_STARTED = 'internalEventStarted';

        /**
         * An Event ended.
         * @event EventMessageEvents#EVENT_ENDED
         */
        this.EVENT_ENDED = 'eventEnded';

        /**
         * An Event ended.
         * @event EventMessageEvents#EVENT_ENDED
         */
        this.INTERNAL_EVENT_ENDED = 'internalEventEnded';

        /**
         * The list of active Events changed.
         * @event EventMessageEvents#EVENTS_CHANGED
         */
        this.EVENTS_CHANGED = 'eventsChanged';
    }
}

const eventMessageEvents = new EventMessageEvents();
export default eventMessageEvents;
