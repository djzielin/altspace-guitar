/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk'; //using our modded version of MRE
//import { Vector3, log } from '../../mixed-reality-extension-sdk/packages/sdk';

export default class GuitarString {
	private ourSounds: MRE.Sound[] = [];
	private notePlaying = 0;
	private notePaused = false;
	private soundPlaying: MRE.MediaInstance = null;
	private noteStartTime = 0;
	public ourActor: MRE.Actor;

	constructor(private stringName: string, private context: MRE.Context, private assets: MRE.AssetContainer, 
		private baseUrl: string) {

		//MRE.log.info("app","in constructor for string " + stringName);

		let indexOffset = 0;

		if (stringName === "A" || stringName ==="D") {
			indexOffset = 2;
		}
		for (let i = 0; i < 13; i++) {
			
			const filename = `${this.baseUrl}/` + "Guitar_" + stringName + "_" + (i + indexOffset).toString() + ".wav";
			MRE.log.info("app","trying to load sound file: " + filename);
			const newSound = this.assets.createSound("guitar"+stringName+i, {
				uri: filename
			});
			this.ourSounds.push(newSound);
		}
		//MRE.log.info("app","finished constructor for string " + stringName);

	}

	public playString(noteRequested: number) {
		//MRE.log.info("app", "Requested to play a note on " + this.stringName + " string!");

		//no sound playing or different note needed
		if (!this.soundPlaying || (this.soundPlaying && (this.notePlaying !== noteRequested))) {
			if (this.soundPlaying) {
				MRE.log.info("app", "   need to switch notes. stopping old note");
				this.soundPlaying.stop();
			} else {
				MRE.log.info("app", "   no notes playing yet(perhaps first note?)");
			}
			const soundInstance: MRE.MediaInstance =
				this.ourActor.startSound(this.ourSounds[noteRequested].id, {
					doppler: 0,
					pitch: 0.0,
					time: 0.0,
					paused: false,
					looping: false,
					volume: 1.0
				});
			this.soundPlaying = soundInstance;
		} else { //otherwise we just restart current note
			MRE.log.info("app", "   note was already playing, just restarting at begining");
			this.soundPlaying.setState({
				doppler: 0,
				pitch: 0.0,
				time: 0.0,
				paused: false,
				looping: false,
				volume: 1.0
			});
		}
		this.noteStartTime = Date.now();
		this.notePaused = false;
		this.notePlaying=noteRequested;
	}

	public pauseIfNeeded() {
		if (this.soundPlaying) {
			if (!this.notePaused) {
				if ((Date.now() - this.noteStartTime) > 5000) {
					MRE.log.info("app", "5 seconds has elapsed. pausing note");
					this.soundPlaying.setState({
						time: 0.0,
						paused: true
					});
					this.notePaused = true;
				}
			}
		}
	}
}
