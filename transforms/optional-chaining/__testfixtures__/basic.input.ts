foo && foo.bar;
foo.bar && foo.bar.baz;
foo.bar && foo.bar.baz();

(foo || {}).bar;
((foo || {}).bar || {}).baz;
((foo || {}).bar || {}).baz();
