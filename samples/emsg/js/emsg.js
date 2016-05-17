/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2016, British Broadcasting Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * - Neither the name of the British Broadcasting Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @param d - the document
 *
 */

/*global dashjs */

var emsg = (function (d) {
    'use strict';

    // keep these global to emsg to save passing them around all over the place
    var player,
        canvas,
        ctx,

        // these are defined in the schema - all coords are in these ranges
        MASTER_WIDTH = 1920,
        MASTER_HEIGHT = 1080,

        // multiplier to transform coords as a ratio to masters above
        widthMultiplier = 1,
        heightMultiplier = 1,

        /**
         * clear the canvas by drawing a rectangle over the whole canvas
         */
        clear = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        /**
         * Draw an X shape made up of two stroked paths
         * note the coordinates provided are based on the origin at bottom left
         * @param {Object} data - the contents of the emsg message_data
         */
        drawCross = function (data) {
            ctx.strokeStyle = data.colour;
            ctx.beginPath();
            ctx.moveTo(data.x1, canvas.height - data.y1);
            ctx.lineTo(data.x2, canvas.height - data.y2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(data.x2, canvas.height - data.y1);
            ctx.lineTo(data.x1, canvas.height - data.y2);
            ctx.stroke();
        },

        /**
         * Draw a stroked rectangle
         * note the coordinates provided are based on the origin at bottom left
         * @param {Object} data - the contents of the emsg message_data
         */
        drawSquare = function (data) {
            ctx.strokeStyle = data.colour;
            ctx.strokeRect(
                data.x1,
                canvas.height - data.y2,
                data.x2 - data.x1,
                data.y2 - data.y1
            );
        },

        // LUT for known shape drawing methods
        shapeMethods = {
            'cross':    drawCross,
            'square':   drawSquare
        },

        eventStartedHandler = function (event) {
            var schemeIdUri =   event.schemeIdUri;
            var value =         event.value;
            var messageData;
            var method;

            if (schemeIdUri === 'tag:rdmedia.bbc.co.uk,2014:events/ballposition' &&
               value === '1') {

                messageData = JSON.parse(event.text);

                messageData.x1 *= widthMultiplier;
                messageData.x2 *= widthMultiplier;
                messageData.y1 *= heightMultiplier;
                messageData.y2 *= heightMultiplier;

                method = shapeMethods[messageData.shape];

                if (method) {
                    method(messageData);
                }
            }
        },

        eventEndedHandler = function () {
            clear();
        },

        /**
         * listen for TrackEvent-like events signalling that new tracks have
         * been added to the player.
         * @param {Event} event - a JS Event object
         */
        tracksChanged = function (event) {
            var type = event.type;
            var siu = event.schemeIdUri;
            var val = event.value;

            // is the track for a schemeIdUri and value we are interested in?
            if (siu === 'tag:rdmedia.bbc.co.uk,2014:events/ballposition' &&
                    val === '1') {
                // yes, so add an event handler
                if (type === 'eventStreamAdded') {
                    player.on('eventStarted', eventStartedHandler);
                    player.on('eventEnded', eventEndedHandler);
                }
                // it's no longer around so don't listen for events
                if (type === 'eventStreamRemoved') {
                    player.off('eventStarted', eventStartedHandler);
                    player.off('eventEnded', eventEndedHandler);
                }
            }
        },

        calculateStyles = function () {
            // set the actual dimensions to the computed dimensions
            var style = getComputedStyle(canvas);
            var w = parseInt(style.width);
            var h = parseInt(style.height);

            canvas.width = w;
            widthMultiplier = w / MASTER_WIDTH;

            canvas.height = h;
            heightMultiplier = h / MASTER_HEIGHT;
        },

        /**
         * configure the canvas for drawing
         */
        setupOverlay = function () {
            // the canvas is in front of the video
            canvas = d.getElementById('overlay');
            ctx = canvas.getContext('2d');

            d.addEventListener('resize', calculateStyles);
            calculateStyles();
        };

    return {

        /**
         * create the player object and attach video and manifest
         */
        start: function () {
            var video = d.getElementById('v');
            var url = 'http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd';

            player = dashjs.MediaPlayer().create();
            player.initialize();
            player.setAutoPlay(true);

            setupOverlay();

            player.on('eventStreamAdded', tracksChanged);
            player.on('eventStreamRemoved', tracksChanged);

            player.attachView(video);
            player.attachSource(url);
        }
    };
}(document));

window.addEventListener('DOMContentLoaded', function () {
    // once the page has loaded, start the player
    emsg.start();
});
