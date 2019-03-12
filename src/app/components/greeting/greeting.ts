import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `
  <h3>Hello {{name}}!</h3>
  <pages-router></pages-router>
  `,
  styles: [
    `h3 { color: green; }`
  ]
})
export class Greeting {
  @Input()
  name: string;

  constructor() {}
}