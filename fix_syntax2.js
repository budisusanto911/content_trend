const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const bad = `                  </div>
                </section>
              )}

              </section>
              
              

              

            </div>`;

const good = `                  </div>
                </section>
              )}
            </div>`;

content = content.replace(bad, good);
fs.writeFileSync(file, content);
