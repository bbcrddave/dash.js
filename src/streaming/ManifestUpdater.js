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
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';
import MediaPlayerModel from './models/MediaPlayerModel';
import Debug from '../core/Debug';
import EventMessageEvents from './events/EventMessageEvents';
import DashEvent from './vo/DashEvent';
import DateTimeMatcher from '../dash/parser/matchers/DateTimeMatcher';

function ManifestUpdater() {

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();
    const dateTimeMatcher = new DateTimeMatcher();

    let instance,
        refreshDelay,
        refreshTimer,
        isPaused,
        isUpdating,
        ignoreManifestInterval,
        manifestLoader,
        manifestModel,
        dashManifestModel,
        mediaPlayerModel;

    function setConfig(config) {
        if (!config) return;

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
    }

    function onInbandUpdateMessage(e) {
        if (e.schemeIdUri !== DashEvent.INBAND_MANIFEST_UPDATE_SCHEMEIDURI) {
            return;
        }

        if (e.duration === 0) {
            // TODO: this should end the presentation without needing to update
            // the manifest. for now, reload the manifest which should have
            // same effect.
            log('stream has ended!');
        }

        // stream is not signalled as ended, check publishTime
        const dashEvent = new DashEvent(e.data, e.value);
        const publishTime = dashEvent.publish_time;

        // assuming message_data conformed to Cor.1 or later ...
        if (dateTimeMatcher.test({ value: publishTime })) {
            const newPublishTime = dateTimeMatcher.converter(publishTime).getTime();
            const oldPublishTime = dashManifestModel.getPublishTime(manifestModel.getValue());

            if (newPublishTime > oldPublishTime) {
                updateManifest(dashEvent.mpd);
            }
        } else {
            // otherwise just force a reload
            updateManifest();
        }
    }

    function onEventStreamChanged(e) {
        if (e.schemeIdUri === DashEvent.INBAND_MANIFEST_UPDATE_SCHEMEIDURI) {
            let callback;

            switch (e.type) {
                case EventMessageEvents.INTERNAL_EVENTSTREAM_ADDED:
                    ignoreManifestInterval = true;
                    break;
                case EventMessageEvents.INTERNAL_EVENTSTREAM_REMOVED:
                    ignoreManifestInterval = false;
                    break;
                default:
                    throw new Error('unexpected event type: ' + e.type);
            }

            switch (e.value) {
                case DashEvent.INBAND_MANIFEST_PATCH_UPDATE_VALUE:
                    log('MPD patching not supported - reloading');
                    /* falls through */
                case DashEvent.INBAND_MANIFEST_REPLACE_UPDATE_VALUE:
                case DashEvent.INBAND_MANIFEST_REMOTE_UPDATE_VALUE:
                    callback = onInbandUpdateMessage;
                    break;
                default:
                    throw new Error('invalid @value' + e.value);
            }

            eventBus[ignoreManifestInterval ? 'on' : 'off'](
                EventMessageEvents.INTERNAL_EVENT_STARTED,
                callback
            );
        }
    }

    function initialize(loader) {
        manifestLoader = loader;
        refreshDelay = NaN;
        refreshTimer = null;
        isUpdating = false;
        isPaused = true;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        ignoreManifestInterval = false;

        eventBus.on(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);
        eventBus.on(EventMessageEvents.INTERNAL_EVENTSTREAM_ADDED, onEventStreamChanged, this);
        eventBus.on(EventMessageEvents.INTERNAL_EVENTSTREAM_REMOVED, onEventStreamChanged, this);
    }

    function setManifest(manifest) {
        update(manifest);
    }

    function getManifestLoader() {
        return manifestLoader;
    }

    function reset() {
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.off(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);
        eventBus.off(EventMessageEvents.INTERNAL_EVENTSTREAM_ADDED, onEventStreamChanged, this);
        eventBus.off(EventMessageEvents.INTERNAL_EVENTSTREAM_REMOVED, onEventStreamChanged, this);

        stopManifestRefreshTimer();
        isPaused = true;
        isUpdating = false;
        refreshDelay = NaN;
        mediaPlayerModel = null;
    }

    function stopManifestRefreshTimer() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function startManifestRefreshTimer() {
        stopManifestRefreshTimer();
        if (!isNaN(refreshDelay)) {
            log('Refresh manifest in ' + refreshDelay + ' seconds.');
            refreshTimer = setTimeout(onRefreshTimer, refreshDelay * 1000);
        }
    }

    function refreshManifest() {
        isUpdating = true;
        const manifest = manifestModel.getValue();
        let url = manifest.url;
        const location = dashManifestModel.getLocation(manifest);
        if (location) {
            url = location;
        }
        manifestLoader.load(url);
    }

    function update(manifest) {

        manifestModel.setValue(manifest);

        const date = new Date();
        const latencyOfLastUpdate = (date.getTime() - manifest.loadedTime.getTime()) / 1000;
        refreshDelay = dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);

        eventBus.trigger(Events.MANIFEST_UPDATED, {manifest: manifest});
        log('Manifest has been refreshed at ' + date + '[' + date.getTime() / 1000 + '] ');

        if (!isPaused) {
            startManifestRefreshTimer();
        }
    }

    function updateManifest(inbandManifestStr) {
        const manifest = manifestModel.getValue();
        let url = manifest.url;
        let overrideParameters;

        if (isPaused || isUpdating) return;
        isUpdating = true;

        const location = dashManifestModel.getLocation(manifest);
        if (location) {
            url = location;
        }

        if (inbandManifestStr) {
            overrideParameters = {
                baseUri:    manifest.baseUri,
                url:        url
            };

            url = window.URL.createObjectURL(new Blob([inbandManifestStr], {type: 'application/dash+xml'}));
        }

        manifestLoader.load(url, overrideParameters);
    }

    function onRefreshTimer() {
        if (isPaused && !mediaPlayerModel.getScheduleWhilePaused() || isUpdating) return;
        refreshManifest();
    }

    function onManifestLoaded(e) {
        if (!e.error) {
            update(e.manifest);
        }
    }

    function onPlaybackStarted (/*e*/) {
        isPaused = false;
        startManifestRefreshTimer();
    }

    function onPlaybackPaused(/*e*/) {
        isPaused = true;
        stopManifestRefreshTimer();
    }

    function onStreamsComposed(/*e*/) {
        // When streams are ready we can consider manifest update completed.
        isUpdating = false;
    }

    instance = {
        initialize: initialize,
        setManifest: setManifest,
        getManifestLoader: getManifestLoader,
        refreshManifest: refreshManifest,
        setConfig: setConfig,
        reset: reset
    };

    return instance;
}
ManifestUpdater.__dashjs_factory_name = 'ManifestUpdater';
export default FactoryMaker.getSingletonFactory(ManifestUpdater);
