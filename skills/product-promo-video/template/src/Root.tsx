import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Product, productDuration} from './Product';
import {Neon, neonDuration, Paper, paperDuration} from './Styles';

// One composition per style. Pick the slide file with --props='{"file":"slides_km.json"}'.
const STYLES = [
  {id: 'Template', component: Product, duration: productDuration, music: 'music/upbeat.m4a'},
  {id: 'Neon', component: Neon, duration: neonDuration, music: 'music/upbeat.m4a'},
  {id: 'Paper', component: Paper, duration: paperDuration, music: 'music/calm.m4a'},
];

export const Root: React.FC = () => (
  <>
    {STYLES.map((st) => (
      <Composition
        key={st.id}
        id={st.id}
        component={st.component as any}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={300}
        defaultProps={{file: 'slides.json'} as any}
        calculateMetadata={async ({props}: any) => {
          const d = await (await fetch(staticFile(props.file || 'slides.json'))).json();
          return {durationInFrames: st.duration(d.slides), props: {...props, data: {...d, music: d.music === undefined ? st.music : d.music}}};
        }}
      />
    ))}
  </>
);
