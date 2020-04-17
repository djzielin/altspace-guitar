/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk'; //using our modded version of MRE
import { Vector3, log } from '../../mixed-reality-extension-sdk/packages/sdk';

//import colorsys from 'colorsys';

export default class SoundHand {
	private soundActor: MRE.Actor;
	private playingSounds: MRE.MediaInstance[] = [];
	private boxMesh: MRE.Mesh;
	private visCubes: MRE.Actor[] = [];
	private frameCounter=0;
	private currentCube: MRE.Actor=null;
	private cubeTarget: MRE.Vector3;

	constructor(private handName: string, private context: MRE.Context, private assets: MRE.AssetContainer) {
		this.soundActor = MRE.Actor.Create(context);
		this.boxMesh = this.assets.createBoxMesh('box', .02, 0.02, 0.02);

		for(let i=0;i<30;i++) {
			const ourMat: MRE.Material = this.assets.createMaterial('cube mat',{
				color: new MRE.Color4(1.0,1.0,1.0,1.0)
			});

			const ourBox = MRE.Actor.Create(this.context, {
				actor: {
					name: 'box'+i,
					transform: {
						local: { position: new MRE.Vector3(0, 0, 0) },
						app: { position: new MRE.Vector3(0, 0, 0) }
					},
					appearance:
					{
						meshId: this.boxMesh.id,
						materialId: ourMat.id
					},
				}
			});

			this.visCubes.push(ourBox);
		}
	}

	public computeFlatDistance(ourVec: MRE.Vector3, ourVec2: MRE.Vector3) {
		const tempPos = ourVec.clone();
		const tempPos2=ourVec2.clone();
		tempPos.y = 0; //ignore height off the ground
		tempPos2.y=0;
		return (tempPos.subtract(tempPos2)).length();
	}

	public playSound(theSound: MRE.Sound) {
		const soundInstance: MRE.MediaInstance = this.soundActor.startSound(theSound.id, {
			doppler: 0,
			pitch: 0.0,
			looping: true,
			volume: 0.0
		});

		this.playingSounds.push(soundInstance); //store for later use
	}

	private clampVal(incoming: number, min: number, max: number): number {
		if (incoming < min) {
			return min;
		}
		if (incoming > max) {
			return max;
		}
		return incoming;
	}

	public updateSound(handName: string, handPos: MRE.Vector3) {
		const flatDist: number = this.computeFlatDistance(handPos,new Vector3(0,0,0));
		const distClamped: number = this.clampVal(flatDist,0.0,1.0);

		const ourHeight = this.clampVal(handPos.y + 0.5,0.0,1.0);

		const ourPitch = (1.0 - ourHeight) * -30.0;
		let ourVol = (1.0 - distClamped);

		
		if (flatDist > 1.0) {
			ourVol = 0.0;
		}

		//MRE.log.info("app", this.handName);
		//MRE.log.info("app", "     handpos1: " + handPos);
		//MRE.log.info("app", "     handpos2: " + handPos2);
		//MRE.log.info("app", "     dist: " + flatDist);
		//MRE.log.info("app", "     height: " + ourHeight);
		//MRE.log.info("app", "     pitch: " + ourPitch);
		//MRE.log.info("app", "     vol: " + ourVol);


		this.playingSounds[0].setState(
			{
				pitch: ourPitch,
				volume: ourVol
			});

		if (this.frameCounter % 3 === 0) {
			//for some reason waiting one frame gives time for position change take effect
			//start the animateTo for the previous cube now!
			if (this.currentCube) {

				this.currentCube.animateTo({
					transform: {
						local: { position: this.cubeTarget }
					}
				}, 1.0 * flatDist, MRE.AnimationEaseCurves.Linear);
			}

			if (flatDist < 1.0) {
				this.currentCube = this.visCubes.shift();
				this.currentCube.transform.app.position = new Vector3(0, 0, 0);

				const jiggledHandPos = new Vector3(
					handPos.x + (Math.random() * 0.005),
					handPos.y + (Math.random() * 0.005),
					handPos.z + (Math.random() * 0.005));
				this.currentCube.transform.local.position = jiggledHandPos;

				this.cubeTarget = new MRE.Vector3(0, this.clampVal(handPos.y, -0.5, 0.5), 0);
				this.currentCube.appearance.material.color = new MRE.Color4(1.0, 0.0, 0.0, 1.0);
				this.visCubes.push(this.currentCube); //add back to the end of the queue
			}
		}

		this.frameCounter++;
	}
}
