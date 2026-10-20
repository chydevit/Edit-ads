import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Main} from './Main';
import {Vertical} from './Vertical';
import {Cover, VerticalCover, PartCard} from './Covers';

// Video compositions read a timeline JSON from the public dir: --props='{"file":"timeline_km.json"}'
const load = async (props: any, fallback: string) => {
  const t = await (await fetch(staticFile(props.file || fallback))).json();
  return {durationInFrames: Math.max(1, t.durationFrames), props: {...props, timeline: t}};
};
const empty = {file: '', timeline: {durationFrames: 1, segments: [], audio: []}} as any;

export const Root: React.FC = () => (
  <>
    <Composition id="Walkthrough" component={Main as any} width={1920} height={1080} fps={30} durationInFrames={300}
      defaultProps={empty} calculateMetadata={({props}) => load(props, 'timeline_en.json')} />
    <Composition id="Ad" component={Main as any} width={1920} height={1080} fps={30} durationInFrames={300}
      defaultProps={empty} calculateMetadata={({props}) => load(props, 'ad_en.json')} />
    <Composition id="Vertical" component={Vertical as any} width={1080} height={1920} fps={30} durationInFrames={300}
      defaultProps={empty} calculateMetadata={({props}) => load(props, 'vertical_en.json')} />
    <Composition id="Cover" component={Cover as any} width={1280} height={720} fps={30} durationInFrames={1} defaultProps={{lines: ['TITLE']} as any} />
    <Composition id="VerticalCover" component={VerticalCover as any} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{lines: ['TITLE']} as any} />
    <Composition id="PartCard" component={PartCard as any} width={1920} height={1080} fps={30} durationInFrames={1}
      defaultProps={{part: 1, of: 5, titles: ['Intro']} as any} />
  </>
);
