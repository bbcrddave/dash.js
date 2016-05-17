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
/**
 * @classdesc DashEvent as defined in ISO/IEC 23009-1:2014/Cor.1:2015
 */

const INBAND_MANIFEST_UPDATE_SCHEMEIDURI    = 'urn:mpeg:dash:event:2012';
const INBAND_MANIFEST_REMOTE_UPDATE_VALUE   = '1';
const INBAND_MANIFEST_PATCH_UPDATE_VALUE    = '2';
const INBAND_MANIFEST_REPLACE_UPDATE_VALUE  = '3';

class DashEvent {
    constructor(message_data, value) {
        var offset = 0;
        var publish_time,
            mpd;

        if (message_data) {
            const _readTerminatedString = function (data) {
                let str = '';

                while (data.byteLength - offset) {
                    const char = data.getUint8(offset++);

                    if (char === 0) {
                        break;
                    }

                    str += String.fromCharCode(char);
                }

                return str.length ? str : undefined;
            };

            publish_time = _readTerminatedString(message_data, offset);

            if (value && value.toString() === INBAND_MANIFEST_REPLACE_UPDATE_VALUE) {
                mpd = _readTerminatedString(message_data, offset);
            }
        }

        this.publish_time   = publish_time;
        this.mpd            = mpd;
    }

    static get INBAND_MANIFEST_UPDATE_SCHEMEIDURI() {
        return INBAND_MANIFEST_UPDATE_SCHEMEIDURI;
    }

    static get INBAND_MANIFEST_REMOTE_UPDATE_VALUE() {
        return INBAND_MANIFEST_REMOTE_UPDATE_VALUE;
    }

    static get INBAND_MANIFEST_PATCH_UPDATE_VALUE() {
        return INBAND_MANIFEST_PATCH_UPDATE_VALUE;
    }

    static get INBAND_MANIFEST_REPLACE_UPDATE_VALUE() {
        return INBAND_MANIFEST_REPLACE_UPDATE_VALUE;
    }
}

export default DashEvent;
