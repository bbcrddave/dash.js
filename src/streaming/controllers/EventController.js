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

import FactoryMaker from '../../core/FactoryMaker';
import EventBus from '../../core/EventBus';
import EventMessageEvents from '../events/EventMessageEvents';
import ISOBoxer from 'codem-isoboxer';

function EventController(config) {

    const HBBTV_COMPLIANT = true;

    const mediaElement = config.mediaElement;
    const eventBus = EventBus(this.context).getInstance();

    const reservedSchemeIdUris = [
        'urn:mpeg:dash:event:2012'
    ];

    const possibleCueTypes = [
        window.DataCue,         // not really supported but available in Edge
        window.VTTCue,          // available in Chrome, FF, Safari
        window.TextTrackCue,    // available in Edge, IE
        () => { throw new Error('no inbuilt cue types available!'); }
    ];

    let EventCue;

    function setup() {
        possibleCueTypes.some(Cue => {
            try {
                const test = new Cue(0, 1, ''); //jshint ignore: line
                EventCue = Cue;
                // exit early
                return true;
            } catch (e) {
                // try the next in the list
            }
        });
    }

    /**
     * translate TextTrackCue enter/exit event into dash.js event
     *
     * @param {Event} event
     */
    function enterExitHandler(event) {
        const possibleEvents = {
            'enter': {
                false:  EventMessageEvents.EVENT_STARTED,
                true:   EventMessageEvents.INTERNAL_EVENT_STARTED
            },
            'exit': {
                false:  EventMessageEvents.EVENT_ENDED,
                true:   EventMessageEvents.INTERNAL_EVENT_ENDED
            }
        };
        const cue = event.target;
        const sv = getSchemeIdUriAndValueFromTrack(cue.track);
        const reserved = sv && reservedSchemeIdUris.indexOf(sv.schemeIdUri) >= 0;
        const eventType = possibleEvents[event.type][reserved];

        eventBus.trigger(
            eventType,
            {
                schemeIdUri:    sv ? sv.schemeIdUri : undefined,
                value:          sv ? sv.value       : undefined,
                duration:       cue.endTime - cue.startTime,
                data:           cue.data,
                text:           cue.text,
                event:          cue
            }
        );
    }

    /**
     * translate TextTrack cuechange Event into dash.js event
     *
     * @param {Event} event
     */
    function cueChangeHandler(event) {
        const track = event.target;
        const sv = getSchemeIdUriAndValueFromTrack(track);

        eventBus.trigger(
            EventMessageEvents.EVENTS_CHANGED,
            {
                schemeIdUri:    sv ? sv.schemeIdUri : undefined,
                value:          sv ? sv.value       : undefined,
                activeEvents:   track.activeCues
            }
        );
    }

    /**
     * to ensure all cues become active, they must have a duration at least
     * as long as time it takes for the user agent to raise them
     *
     * @param {Event} event
     * @returns {Number} duration
     */
    function ensureSensibleDuration(event) {
        const MINIMUM_DURATION_S = HBBTV_COMPLIANT ? 0.250 : 0;
        const duration = event.duration === 0xFFFF ?
                    Infinity :
                    event.duration / (event.timescale || 1);

        event.duration = duration;

        // duration has a special meaning for dash events - don't apply a
        // minimum value for reserved schemes
        if (reservedSchemeIdUris.indexOf(event.schemeIdUri) === -1) {
            if (duration < MINIMUM_DURATION_S) {
                event.duration = MINIMUM_DURATION_S;
            }
        }

        return event.duration;
    }

    /**
     * search the cue list for a cue with the same id (and, by definition,
     * same schemeIdUri and value). deliberately do not use getCueById
     * since that method returns the first instance - we may want another.
     *
     * @param {TextTrackCueList} cues
     * @param {EventCue} cue
     * @returns {EventCue|undefined} cue
     */
    function findExistingCue(cues, cue) {
        const numCues = cues.length;
        let i = 0;

        while (i < numCues) {
            if (cues[i].id === cue.id) {
                if ((cue.startTime >= cues[i].startTime) &&
                        (cue.startTime < cues[i].endTime)) {
                    return cues[i];
                }
            }

            i += 1;
        }
    }

    /**
     * given a schemeIdUri and value, find a matching TextTrack
     *
     * @param {string} schemeIdUri
     * @param {string} value
     * @param {boolean} includeDisabled - should search disabled tracks too
     * @returns {TextTrack|undefined}
     */
    function findTrackBySchemeIdUriAndValue(schemeIdUri, value, includeDisabled) {
        const tracks = mediaElement.textTracks;
        const trackLabel = schemeIdUri + ' ' + value;

        if (tracks) {
            const numTracks = tracks.length;

            for (let i = 0; i < numTracks; i += 1) {
                const track = tracks[i];

                if (track.label === trackLabel) {
                    if (includeDisabled || track.mode !== 'disabled') {
                        return track;
                    } else {
                        return undefined;
                    }
                }
            }
        }
    }

    /**
     * given a TextTrack, return the schemeIdUri and value
     *
     * @param {TextTrack} track
     * @returns {Object} object containing schemeIdUri and value of track
     */
    function getSchemeIdUriAndValueFromTrack(track) {
        const tracks = mediaElement.textTracks;

        if (tracks) {
            const numTracks = tracks.length;

            for (let i = 0; i < numTracks; i += 1) {
                if (tracks[i] === track) {
                    const labelParts = track.label.split(' ');

                    return {
                        schemeIdUri:    labelParts[0],
                        value:          labelParts[1]
                    };
                }
            }
        }
    }

    /**
     * create a track on the media element
     * if there is already a text track with the same schemeIduri and value
     * they are equivalent. just return the original one, re-enabling it if
     * necessary.
     *
     * @param {string} schemeIdUri
     * @param {string} value
     * @returns {TextTrack} track
     */
    function createTrack(schemeIdUri, value) {
        const label = schemeIdUri + ' ' + value;
        let track = findTrackBySchemeIdUriAndValue(
            schemeIdUri,
            value,
            true
        );

        if (!track) {
            track = mediaElement.addTextTrack('metadata', label, '');
            if (track) {
                track.mode = 'hidden';
            }
        } else {
            if (track.mode === 'disabled') {
                track.mode = 'hidden';

                // when calling addTextTrack above, this event will be
                // dispatched automatically. in the reenabling case, we
                // must do it ourselves.
                mediaElement.textTracks.dispatchEvent(
                    new TrackEvent('addtrack', { track: track })
                );
            }
        }

        let trackAddedEventType = EventMessageEvents.INTERNAL_EVENTSTREAM_ADDED;

        if (reservedSchemeIdUris.indexOf(schemeIdUri) === -1) {
            trackAddedEventType = EventMessageEvents.EVENTSTREAM_ADDED;
            track.addEventListener('cuechange', cueChangeHandler);
        }

        eventBus.trigger(
            trackAddedEventType,
            {
                schemeIdUri:    schemeIdUri,
                value:          value,
                track:          track
            }
        );

        return track;
    }

    /**
     * 'remove' the track from the media element
     * (there's no API call to removeTextTrack, so just delete all
     * the cues and set the mode to disabled.)
     *
     * @param {TextTrack} track
     * @param {string|undefined} schemeIdUri
     * @param {string|undefined} value
     */
    function removeTrack(track, schemeIdUri, value) {
        if (track && track.mode !== 'disabled') {
            let numCues = track.cues.length;
            while (numCues) {
                const cue = track.cues[numCues - 1];

                cue.removeEventListener('enter', enterExitHandler);
                cue.removeEventListener('exit', enterExitHandler);

                track.removeCue(cue);

                numCues -= 1;
            }

            track.mode = 'disabled';

            // if schemeIdUri or value were not provided, get them from track
            if (!schemeIdUri || !value) {
                const sv = getSchemeIdUriAndValueFromTrack(track);

                if (sv) {
                    schemeIdUri = sv.schemeIdUri;
                    value = sv.value;
                }
            }

            let trackRemovedEventType = EventMessageEvents.INTERNAL_EVENTSTREAM_REMOVED;

            if (reservedSchemeIdUris.indexOf(schemeIdUri) === -1) {
                trackRemovedEventType = EventMessageEvents.EVENTSTREAM_REMOVED;
                track.removeEventListener('cuechange', cueChangeHandler);
            }

            eventBus.trigger(
                trackRemovedEventType,
                {
                    schemeIdUri:    schemeIdUri,
                    value:          value,
                    track:          track
                }
            );

            // note that, by explicitly dispatching here, this event may
            // be dispatched twice when the media resource is torn down.
            // this may need to be considered in handlers. unfortunately
            // there isn't really a way around this. since the media
            // element persists across sessions, hopefully it shouldn't be
            // an issue.
            mediaElement.textTracks.dispatchEvent(
                new TrackEvent('removetrack', { track: track })
            );
        }
    }

    /**
     * given a schemeIdUri and value, remove track from the media element
     *
     * @param {string} schemeIdUri
     * @param {string} value
     */
    function removeTrackBySchemeAndValue(schemeIdUri, value) {
        removeTrack(
            findTrackBySchemeIdUriAndValue(
                schemeIdUri,
                value
            ),
            schemeIdUri,
            value
        );
    }

    /**
     * iterate accross the tracklist, 'removing' each track
     */
    function removeAllTracks() {
        var tracks = mediaElement.textTracks;

        if (tracks) {
            const numTracks = tracks.length;

            for (let i = 0; i < numTracks; i += 1) {
                removeTrack(tracks[i]);
            }
        }
    }

    /**
     * add Events and InbandEvents to Track, modifying existing cues if
     * necessary. uses Cue objects to represent Events
     *
     * @param {TextTrack} track
     * @param {Array.<Event>|Array.<InbandEvent>} events
     * @param {Number} timescale - timescale
     */
    function addEventsToTrack(track, events, timescale) {
        if (track && Array.isArray(events)) {
            events.forEach(event => {
                const startTime = (event.presentationTime || 0) / (timescale || 1);
                const duration = ensureSensibleDuration(event);
                const endTime = Math.min(Number.MAX_VALUE, startTime + duration);

                const cue = new EventCue(
                    startTime,
                    endTime,
                    // attempt to stringify the data - might be inappropriate
                    // depending on the data but simplifies use for many cases
                    ISOBoxer.Utils.dataViewToString(event.messageData, 'utf-8')
                );

                cue.id = event.id;
                cue.data = event.messageData;

                const existingCue = findExistingCue(track.cues, cue);
                if (existingCue) {
                    // update the existing cue in place with deep copy
                    // probably only need endTime and text, but be safe
                    for (const key in cue) {
                        if (cue.hasOwnProperty(key)) {
                            existingCue[key] = cue[key];
                        }
                    }
                } else {
                    track.addCue(cue);

                    cue.addEventListener('enter', enterExitHandler);
                    cue.addEventListener('exit', enterExitHandler);
                }
            });
        }
    }

    /**
     * add EventStreams and Events, creating Tracks if necessary
     *
     * @param {Array.<EventStream>} eventStreams
     * @param {boolean} clearEvents - optionally remove all existing EventStreams
     */
    function addEventStreams(eventStreams, clearEvents) {
        if (clearEvents) {
            removeAllTracks();
        }

        if (Array.isArray(eventStreams)) {
            eventStreams.forEach(eventStream => {
                // will return the track if it already exists
                const track = createTrack(
                    eventStream.schemeIdUri,
                    eventStream.value
                );

                if (track) {
                    addEventsToTrack(
                        track,
                        eventStream.events,
                        eventStream.timescale
                    );
                }
            });
        }
    }

    /**
     * remove Tracks associated with EventStream objects
     *
     * @param {Array.<EventStream>} eventStreams
     */
    function removeEventStreams(eventStreams) {
        if (Array.isArray(eventStreams)) {
            eventStreams.forEach(eventStream => {
                removeTrackBySchemeAndValue(
                    eventStream.schemeIdUri,
                    eventStream.value
                );
            });
        }
    }

    /**
     * Handles the switch between Representations or AdaptationSets by
     * taking arrays of old and new EventStreams and managing the TextTrack
     * according to their contents: entries which exist in both will remain
     * unchanged, old entries only will be removed, new only added.
     *
     * @param {Array.<EventStream>} oldEventStreams - the previous list of EventStreams
     * @param {Array.<EventStream>} newEventStreams - the list of new EventStreams
     */
    function handleSwitch(oldEventStreams, newEventStreams) {
        if (oldEventStreams && newEventStreams) {
            const areEquivalent =
                (l, r) => ['schemeIdUri', 'value', 'id'].every(
                    p => l[p] === r[p]
                );

            // there is certainly a more efficient way of achieving this,
            // but the number of entries should be small.
            const getDifference =
                (l, r) => l.filter(
                    l1 => !r.some(
                        r1 => areEquivalent(l1, r1)
                    )
                );

            removeEventStreams(getDifference(oldEventStreams, newEventStreams));
            addEventStreams(getDifference(newEventStreams, oldEventStreams));
        }
    }

    /**
     * adds an Event object to the associated Track
     *
     * @param {Array.<InbandEvent>} events
     */
    function addInbandEvents(events) {
        if (Array.isArray(events)) {
            events.forEach(event => {
                const track = findTrackBySchemeIdUriAndValue(
                    event.schemeIdUri,
                    event.value
                );

                if (track) {
                    addEventsToTrack(
                        track,
                        [event],
                        event.timescale
                    );
                }
            });
        }
    }

    /**
     * initialize the controller, adding EventStreams if necessary
     *
     * @param {Array.<EventStream>} eventStreams
     */
    function initialize(eventStreams) {
        if (eventStreams) {
            addEventStreams(eventStreams);
        }
    }

    /**
     * reset this controller, disabling all tracks
     */
    function reset() {
        removeAllTracks();
    }

    const instance = {
        initialize: initialize,
        handleRepresentationSwitch: handleSwitch,
        handleAdaptationSetSwitch: handleSwitch,
        handlePeriodSwitch: handleSwitch,
        addInbandEvents: addInbandEvents,
        addEventStreams: addEventStreams,
        reset: reset
    };

    setup();

    return instance;
}

EventController.__dashjs_factory_name = 'EventController';
export default FactoryMaker.getClassFactory(EventController);
