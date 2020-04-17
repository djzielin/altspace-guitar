/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

//import colorsys from 'colorsys';
import SoundHand from './hand'
import { Vector3 } from '../../mixed-reality-extension-sdk/packages/sdk/';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;

	private allRightHands = new Map();
	private ourRightHand: MRE.Actor = null;
	private rightSoundHand: SoundHand = null;

	private allLeftHands = new Map();
	private ourLeftHand: MRE.Actor = null;
	private leftSoundHand: SoundHand = null;

	private ourSounds: MRE.Sound[] = [];

	constructor(private context: MRE.Context, private baseUrl: string) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);

		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));
	}

	private userJoined(user: MRE.User) {
		MRE.log.info("app", "user joined. name: " + user.name + " id: " + user.id);

		const rHand = MRE.Actor.Create(this.context, {
			actor: {
				name: "rHand" + user.id,
				transform: {
					local: { position: new MRE.Vector3(0, 0.0, 0.2) }
				},
				attachment: {
					attachPoint: 'right-hand',
					userId: user.id
				}	
			}
		});
		if (rHand) {
			MRE.log.info("app", "   added their right hand");
			rHand.subscribe('transform');
			this.allRightHands.set(user.id, rHand);
		} else {
			MRE.log.info("app", "   ERROR during hand creation!!");
		}

		
		const lHand = MRE.Actor.Create(this.context, {
			actor: {
				name: "lHand" + user.id,
				transform: {
					local: { position: new MRE.Vector3(0, 0.0, 0.2) }
				},
				attachment: {
					attachPoint: 'left-hand',
					userId: user.id
				}
			}
		});
				
		if (lHand) {
			MRE.log.info("app", "   added their left hand");
			lHand.subscribe('transform');	
			this.allLeftHands.set(user.id, lHand);
		} else {
			MRE.log.info("app", "   ERROR during hand creation!!");
		}
	}

	private userLeft(user: MRE.User) {
		MRE.log.info("app", "user left. name: " + user.name + " id: " + user.id);

		const lHand: MRE.Actor = this.allLeftHands.get(user.id);
		if (lHand) {
			this.allLeftHands.delete(user.id)
			//lHand.destroy(); //why does this cause a bunch of errors to be thrown?
			MRE.log.info("app", "  succesfully remove left hand");
		} else {
			MRE.log.info("app", "  ERROR: no left hand found");
		}

		const rHand: MRE.Actor = this.allRightHands.get(user.id);
		if (rHand) {
			this.allRightHands.delete(user.id);
			//rHand.destroy(); //why does this cause a bunch of errors to be thrown?
			MRE.log.info("app", "  succesfully remove right hand");
		} else {
			MRE.log.info("app", "  ERROR: no right hand found");
		}
	}

	private Vector2String(v: Vector3, precision: number){
		return 	"{X: " + v.x.toFixed(precision) +
				" Y: " + v.y.toFixed(precision) + 
				" Z: " + v.z.toFixed(precision) + "}";
	}
	
	//TODO rewrite this to generate list of all distances, then sort
	private findClosestHand(handName: string, handMap: Map<string, MRE.Actor>) {
		let closestDist = Infinity;
		let closestActor: MRE.Actor = null;
		let closestIndex = -1;
		let index = 0;
		let allDists: Map<number, MRE.Actor>;

		MRE.log.info("app", "Trying to find closest " + handName);
		for (let hand of handMap.values()) {
			const hDist = this.rightSoundHand.computeFlatDistance(hand.transform.app.position, new Vector3(0,0,0));
			MRE.log.info("app","  user: " + index + 
								" pos: " + this.Vector2String(hand.transform.app.position,3) +
								" dist: " + hDist.toFixed(3));
			if (hDist < closestDist) {
				closestDist = hDist;
				closestActor = hand;
				closestIndex = index;
			}
			index++;
		}
		MRE.log.info("app", "  closest hand is user: " + closestIndex);

		return closestActor;
	}

	private loadSound(filename: string) {
		MRE.log.info("app", "trying to load filename: " + filename);
		const newSound = this.assets.createSound("dave long sound", {
			uri: filename
		});
		if (newSound) {
			MRE.log.info("app", "   succesfully loaded sound!");
		}
		this.ourSounds.push(newSound);
	}

	private started() {
		MRE.log.info("app", "our started callback has begun");

		//this.loadSound(`${this.baseUrl}/noise_20s.wav`);
		this.loadSound(`${this.baseUrl}/saw_20s.wav`);

		this.rightSoundHand = new SoundHand("right", this.context, this.assets);
		this.rightSoundHand.playSound(this.ourSounds[0]);

		this.leftSoundHand = new SoundHand("left", this.context, this.assets);
		this.leftSoundHand.playSound(this.ourSounds[0]);

		const circle = this.assets.createCylinderMesh('circle', 1.0, 0.01, 'y', 16);
		const ourPole = MRE.Actor.Create(this.context, {
			actor: {
				name: 'the pole',
				appearance: { meshId: circle.id }
			}
		});

		setInterval(() => {
			if (this.ourRightHand) {
				this.rightSoundHand.updateSound("righthand",this.ourRightHand.transform.app.position);
			}
			if (this.ourLeftHand) {
				this.leftSoundHand.updateSound("lefthand",this.ourLeftHand.transform.app.position);
			}
		}, 30); //fire every 30ms
		

		//keep checking who has the closest hand to theremin. put that hand in charge
		setInterval(() => {
			this.ourRightHand = this.findClosestHand("righthand",this.allRightHands);
			this.ourLeftHand = this.findClosestHand("lefthand",this.allLeftHands);
		}, 1000); //fire every 1 sec
	}
}
