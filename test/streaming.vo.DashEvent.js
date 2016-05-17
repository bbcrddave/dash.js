import DashEvent from '../src/streaming/vo/DashEvent';

const expect = require('chai').expect;

const stringToUint8DataView = s => {
    const length = s.length;
    const ab = new ArrayBuffer(length);
    const dv = new DataView(ab);
    var i;

    for (i = 0; i < length; i += 1) {
        dv.setUint8(i, s.charCodeAt(i));
    }

    return dv;
};

const PUBLISH_TIME_STRING = 'publish_time';
const NULL_TERMINATOR = '\0';
const MPD_STRING = 'mpd';

describe('DashEvent', function () {

    it('should return sensible defaults when no input', () => {
        const dashEvent = new DashEvent();

        expect(dashEvent.publish_time).to.be.undefined;  // jshint ignore:line
        expect(dashEvent.mpd).to.be.undefined;           // jshint ignore:line
    });

    it('should return a publish_time when valid input supplied', () => {
        const message_data = stringToUint8DataView(PUBLISH_TIME_STRING);

        const dashEvent = new DashEvent(message_data);

        expect(dashEvent.publish_time).to.equal(PUBLISH_TIME_STRING);   // jshint ignore:line
        expect(dashEvent.mpd).to.be.undefined;                          // jshint ignore:line
    });

    it('should return a publish_time and mpd when valid inputs supplied', () => {
        const message_data = stringToUint8DataView(
            PUBLISH_TIME_STRING +
            NULL_TERMINATOR +
            MPD_STRING
        );
        const value = DashEvent.INBAND_MANIFEST_REPLACE_UPDATE_VALUE;

        const dashEvent = new DashEvent(message_data, value);

        expect(dashEvent.publish_time).to.equal(PUBLISH_TIME_STRING);   // jshint ignore:line
        expect(dashEvent.mpd).to.equal(MPD_STRING);                     // jshint ignore:line
    });

    it('should return only a publish_time when mpd but no value supplied', () => {
        const message_data = stringToUint8DataView(
            PUBLISH_TIME_STRING +
            NULL_TERMINATOR +
            MPD_STRING
        );

        const dashEvent = new DashEvent(message_data);

        expect(dashEvent.publish_time).to.equal(PUBLISH_TIME_STRING);   // jshint ignore:line
        expect(dashEvent.mpd).to.be.undefined;                          // jshint ignore:line
    });

    it('should return only a publish_time when invalid value supplied', () => {
        const message_data = stringToUint8DataView(
            PUBLISH_TIME_STRING +
            NULL_TERMINATOR +
            MPD_STRING
        );
        const value = DashEvent.INBAND_MANIFEST_PATCH_UPDATE_VALUE;

        const dashEvent = new DashEvent(message_data, value);

        expect(dashEvent.publish_time).to.equal(PUBLISH_TIME_STRING);   // jshint ignore:line
        expect(dashEvent.mpd).to.be.undefined;                          // jshint ignore:line
    });

    it('should return only a publish_time when no mpd supplied in message_data', () => {
        const message_data = stringToUint8DataView(PUBLISH_TIME_STRING);
        const value = DashEvent.INBAND_MANIFEST_REPLACE_UPDATE_VALUE;

        const dashEvent = new DashEvent(message_data, value);

        expect(dashEvent.publish_time).to.equal(PUBLISH_TIME_STRING);   // jshint ignore:line
        expect(dashEvent.mpd).to.be.undefined;                          // jshint ignore:line
    });
});
