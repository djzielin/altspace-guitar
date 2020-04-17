/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { Vector3 } from '../../mixed-reality-extension-sdk/packages/sdk/';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;

	private ourSounds: MRE.Sound[] = [];
	private ourKeys: MRE.Actor[] = [];
	private activeSounds: Map<number,MRE.MediaInstance> = new Map();
	private sphereMesh: MRE.Mesh; //for hand
	private sphereMat: MRE.Material;
	private noteColor: MRE.Material;
	private noteTouchedColor: MRE.Material;
	private dotMat: MRE.Material;

	private allRightHands = new Map();
	private ourRightHand: MRE.Actor = null;

	private allLeftHands = new Map();
	private ourLeftHand: MRE.Actor = null;

	private clampVal(incoming: number): number {
		if (incoming < 0) {
			return 0;
		}
		if (incoming > 1) {
			return 1;
		}
		return incoming;
	}

	constructor(private context: MRE.Context, private baseUrl: string) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);

		this.sphereMesh = this.assets.createSphereMesh('sphere', 1.0, 8);
		this.sphereMat = this.assets.createMaterial('spheremat', {
			color: new MRE.Color4(0, 0, 1)
		});

		this.noteColor = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(139.0 / 255.0, 69.0 / 255.0, 19.0 / 255.0)
		});
		this.noteTouchedColor = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(this.clampVal(139.0 / 255.0 * 1.5),
				this.clampVal(69.0 / 255.0 * 1.5),
				this.clampVal(19.0 / 255.0 * 1.5))
		});

		this.dotMat = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});


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
					local: {
						position: new MRE.Vector3(0, 0.0, 0.1),
						scale: new Vector3(0.02, 0.02, 0.02)
					}
				},
				attachment: {
					attachPoint: 'right-hand',
					userId: user.id
				},
				appearance:
				{
					meshId: this.sphereMesh.id,
					materialId: this.sphereMat.id
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
					local: {
						position: new MRE.Vector3(0, 0.0, 0.1),
						scale: new Vector3(0.02, 0.02, 0.02)
					}
				},
				attachment: {
					attachPoint: 'left-hand',
					userId: user.id
				},
				appearance:
				{
					meshId: this.sphereMesh.id,
					materialId: this.sphereMat.id
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

	public computeFlatDistance(ourVec: MRE.Vector3, ourVec2: MRE.Vector3) {
		const tempPos = ourVec.clone();
		const tempPos2=ourVec2.clone();
		tempPos.y = 0; //ignore height off the ground
		tempPos2.y=0;
		return (tempPos.subtract(tempPos2)).length();
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
			const hDist = this.computeFlatDistance(hand.transform.app.position, new Vector3(0,0,0));
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

		//if we want to play audio originating in altspace
				/*if (vel > 0) {
					const soundInstance: MRE.MediaInstance =
						this.ourKeys[adjustedNote].startSound(this.ourSounds[adjustedNote].id, {
							doppler: 0,
							pitch: 0.0,
							looping: false,
							volume: 1.0
						});
					this.activeSounds.set(note, soundInstance);
				} else {
					if (this.activeSounds.has(note)) {
						const playingSoud: MRE.MediaInstance = this.activeSounds.get(note);
						playingSoud.stop();
						this.activeSounds.delete(note);
					}
				}*/

	private createDot(ourPos: Vector3, ourScale: Vector3)
	{
		MRE.Actor.Create(this.context, { //front dots
			actor: {
				name: 'dot',
				transform: {
					local: {
						position: new MRE.Vector3(0, 0, 0),
						scale: ourScale
					},
					app: { position: ourPos }
				},
				appearance:
				{
					meshId: this.sphereMesh.id,
					materialId: this.dotMat.id
				},
			}
		});
	}

	private started() {
		MRE.log.info("app", "started callback has begun");

		const boxMesh = this.assets.createBoxMesh('box', 0.04, 0.1, 0.02);		
		const fretMesh: MRE.Mesh = this.assets.createBoxMesh('box', 0.005, 0.1, 0.02);
	
		const fretMat: MRE.Material = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(211.0 / 255.0, 211.0 / 255.0, 211.0 / 255.0)
		});

		for (let i = 0; i < 13; i++) {

			const filename = `${this.baseUrl}/` + "Guitar_E_" + i + ".wav";
			this.loadSound(filename);

			const keyPos = new MRE.Vector3(12 * 0.045 - i * 0.045, 0, 0);

			let showNote = true;
			if (i === 0) {
				showNote = false;
			}
			const keyActor = MRE.Actor.Create(this.context, {
				actor: {
					name: 'box' + i,
					transform: {
						local: { position: new MRE.Vector3(0, 0, 0) },
						app: { position: keyPos }
					},
					appearance:
					{
						meshId: boxMesh.id,
						materialId: this.noteColor.id,
						enabled: showNote
					},
				}
			});
			this.ourKeys.push(keyActor);

			MRE.Actor.Create(this.context, { //create Fret
				actor: {
					name: 'fret' + i,
					transform: {
						local: {
							position: new MRE.Vector3(0, 0, 0),
							scale: new Vector3(1, 1, 1)
						},
						app: { position: keyPos.add(new Vector3(-0.045 / 2.0, 0, 0)) }
					},
					appearance:
					{
						meshId: fretMesh.id,
						materialId: fretMat.id
					},
				}
			});

			if (i === 3 || i === 5 || i === 7 || i === 9) { 	//dots on fretboard
				this.createDot(keyPos.add(new Vector3(0, 0, -0.01)), new Vector3(0.005, 0.005, 0.001));
				this.createDot(keyPos.add(new Vector3(0, 0.05, 0.0)), new Vector3(0.005, 0.001, 0.005));	
			}
			if (i === 12) { 	//double dots on fretboard
				
				this.createDot(keyPos.add(new Vector3(0.0, 0.01, -0.01)), new Vector3(0.005, 0.005, 0.001));
				this.createDot(keyPos.add(new Vector3(0.0, -0.01, -0.01)), new Vector3(0.005, 0.005, 0.001));
				
				this.createDot(keyPos.add(new Vector3(0.01, 0.05, 0.0)), new Vector3(0.005, 0.001, 0.005));	
				this.createDot(keyPos.add(new Vector3(-0.01, 0.05, 0.0)), new Vector3(0.005, 0.001, 0.005));			
			}
		}
	
		setInterval(() => {
			/*if (this.ourRightHand) {
				this.rightSoundHand.updateSound(this.ourRightHand.transform.app.position);
			}
			if (this.ourLeftHand) {
				this.leftSoundHand.updateSound(this.ourLeftHand.transform.app.position);
			}*/
		}, 30); //fire every 30ms
		

		//keep checking who has the closest hand to guitar. put that hand in charge
		setInterval(() => {
			this.ourRightHand = this.findClosestHand("righthand",this.allRightHands);
			this.ourLeftHand = this.findClosestHand("lefthand",this.allLeftHands);
		}, 1000); //fire every 1 sec
	}
}
